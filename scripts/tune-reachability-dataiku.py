
#!/usr/bin/env python3
"""
Dataiku recipe script: tune reachability + balanced distribution.

How to use in Dataiku:
1) Upload dimensions.json, questions.json, results.json into INPUT managed folder.
2) Set INPUT_FOLDER_ID and OUTPUT_FOLDER_ID below.
3) Run this as a Python recipe (or notebook cell).

Hard stop guards prevent endless loops:
- MAX_SECONDS
- MAX_ITERATIONS
- STAGNATION_PATIENCE
"""

from __future__ import annotations

import copy
import io
import json
import math
import os
import random
import time

try:
    import dataiku  # type: ignore
except Exception:
    dataiku = None


CONFIG = {
    # Dataiku managed folders
    "INPUT_FOLDER_ID": "CLASSILITY_INPUT",
    "OUTPUT_FOLDER_ID": "CLASSILITY_OUTPUT",
    "DIMENSIONS_FILE": "dimensions.json",
    "QUESTIONS_FILE": "questions.json",
    "RESULTS_FILE": "results.json",
    "OUTPUT_QUESTIONS_FILE": "questions.tuned.json",
    "OUTPUT_SUMMARY_FILE": "tuning.summary.json",

    # Local fallback paths (used if Dataiku is unavailable)
    "LOCAL_DIMENSIONS_PATH": "data/dimensions.json",
    "LOCAL_QUESTIONS_PATH": "data/questions.json",
    "LOCAL_RESULTS_PATH": "data/results.json",
    "LOCAL_OUTPUT_DIR": "out",

    # Goal + loop guards
    "TARGET_REACHABILITY": 1.0,
    "OPTIMIZE_PROBABILITY": True,
    "PROBABILITY_TOLERANCE": 0.02,      # 2%
    "FALLBACK_TARGET_RATE": 0.02,       # 2%, should stay lowest share

    "MAX_SECONDS": 3600,
    "MAX_ITERATIONS": 3000,
    "STAGNATION_PATIENCE": 500,

    # Search depth
    "SEARCH_RESTARTS": 16,
    "SEARCH_ITERATIONS": 8000,
    "ANSWER_MUTATION_SPAN": 2,

    # Weight mutation
    "WEIGHT_MUTATION_COUNT": 8,
    "WEIGHT_MUTATION_STEP": 3,
    "WEIGHT_LIMIT": 20,

    # Probability estimation
    "PROBABILITY_SAMPLES": 20000,
    "PROBABILITY_WEIGHT": 1.0,
    "NO_ELIGIBLE_WEIGHT": 3.0,

    "SEED": 20260210,
    "LOG_EVERY": 20,
    "WRITE_BEST_IF_NOT_MET": True,
}

SCORE_MIN = -20
SCORE_MAX = 20
REACH_SCALE = 1_000_000
EPS = 1e-12


def clamp(value: float, lower: float, upper: float) -> float:
    return max(lower, min(upper, value))


def is_dataiku_mode() -> bool:
    return bool(dataiku and CONFIG["INPUT_FOLDER_ID"] and CONFIG["OUTPUT_FOLDER_ID"])


def read_json_payloads() -> tuple[dict, dict, dict]:
    if is_dataiku_mode():
        folder = dataiku.Folder(CONFIG["INPUT_FOLDER_ID"])

        def read_one(name: str) -> dict:
            with folder.get_download_stream(name) as stream:
                return json.load(io.TextIOWrapper(stream, encoding="utf-8"))

        return (
            read_one(CONFIG["DIMENSIONS_FILE"]),
            read_one(CONFIG["QUESTIONS_FILE"]),
            read_one(CONFIG["RESULTS_FILE"]),
        )

    with open(CONFIG["LOCAL_DIMENSIONS_PATH"], "r", encoding="utf-8") as f:
        dims = json.load(f)
    with open(CONFIG["LOCAL_QUESTIONS_PATH"], "r", encoding="utf-8") as f:
        questions = json.load(f)
    with open(CONFIG["LOCAL_RESULTS_PATH"], "r", encoding="utf-8") as f:
        results = json.load(f)
    return dims, questions, results


def write_outputs(tuned_questions: dict, summary: dict) -> None:
    if is_dataiku_mode():
        folder = dataiku.Folder(CONFIG["OUTPUT_FOLDER_ID"])
        folder.upload_data(
            CONFIG["OUTPUT_QUESTIONS_FILE"],
            (json.dumps(tuned_questions, indent=2) + "\n").encode("utf-8"),
        )
        folder.upload_data(
            CONFIG["OUTPUT_SUMMARY_FILE"],
            (json.dumps(summary, indent=2) + "\n").encode("utf-8"),
        )
        return

    os.makedirs(CONFIG["LOCAL_OUTPUT_DIR"], exist_ok=True)
    with open(
        os.path.join(CONFIG["LOCAL_OUTPUT_DIR"], CONFIG["OUTPUT_QUESTIONS_FILE"]),
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(tuned_questions, f, indent=2)
        f.write("\n")

    with open(
        os.path.join(CONFIG["LOCAL_OUTPUT_DIR"], CONFIG["OUTPUT_SUMMARY_FILE"]),
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(summary, f, indent=2)
        f.write("\n")


def normalize_condition(cond: dict, dim_index: dict[str, int]) -> dict:
    t = cond.get("type")

    def dim(name: str) -> int:
        if name not in dim_index:
            raise ValueError(f"Unknown dimension in conditions: {name}")
        return dim_index[name]

    if t in {"min", "max_le", "max_ge"}:
        return {"type": t, "dim": dim(cond["dim"]), "value": float(cond["value"])}
    if t in {"top_is", "not_top_is"}:
        return {"type": t, "dim": dim(cond["dim"])}
    if t == "rank_is":
        return {"type": t, "dim": dim(cond["dim"]), "rank": int(cond["rank"])}
    if t in {"diff_greater", "diff_abs_lte"}:
        return {
            "type": t,
            "a": dim(cond["a"]),
            "b": dim(cond["b"]),
            "value": float(cond["value"]),
        }
    if t in {"top_diff_gte", "top_diff_lte", "total_min", "total_max"}:
        return {"type": t, "value": float(cond["value"])}
    if t in {"sum_min", "sum_max"}:
        return {"type": t, "dims": [dim(x) for x in cond["dims"]], "value": float(cond["value"])}
    if t == "spread_between":
        return {"type": t, "min": float(cond["min"]), "max": float(cond["max"])}

    raise ValueError(f"Unsupported condition type: {t}")


def questions_to_matrix(questions: list[dict], dimensions: list[str]) -> list[list[list[int]]]:
    dim_index = {d: i for i, d in enumerate(dimensions)}
    matrix: list[list[list[int]]] = []
    for q in questions:
        options = []
        for opt in q.get("options", []):
            vec = [0 for _ in dimensions]
            for dim, raw in (opt.get("weights") or {}).items():
                if dim in dim_index:
                    vec[dim_index[dim]] = int(round(float(raw)))
            options.append(vec)
        matrix.append(options)
    return matrix


def matrix_to_questions_file(original: dict, matrix: list[list[list[int]]], dimensions: list[str]) -> dict:
    out = copy.deepcopy(original)
    for qi, q in enumerate(out.get("questions", [])):
        for oi, opt in enumerate(q.get("options", [])):
            if qi < len(matrix) and oi < len(matrix[qi]):
                vec = matrix[qi][oi]
                opt["weights"] = {dim: int(vec[di]) for di, dim in enumerate(dimensions)}
    return out


def clone_matrix(matrix: list[list[list[int]]]) -> list[list[list[int]]]:
    return [[opt[:] for opt in q] for q in matrix]

def create_random_answers(matrix: list[list[list[int]]], rng: random.Random) -> list[int]:
    return [rng.randrange(len(q)) if q else 0 for q in matrix]


def mutate_answers(
    current: list[int],
    matrix: list[list[list[int]]],
    rng: random.Random,
    mutation_span: int,
) -> list[int]:
    nxt = list(current)
    steps = 1 + rng.randrange(max(1, mutation_span))
    for _ in range(steps):
        qi = rng.randrange(len(matrix))
        option_count = len(matrix[qi])
        if option_count <= 1:
            continue
        prev = nxt[qi]
        cand = prev
        while cand == prev:
            cand = rng.randrange(option_count)
        nxt[qi] = cand
    return nxt


def score_answers(dim_count: int, matrix: list[list[list[int]]], answers: list[int]) -> list[int]:
    scores = [0] * dim_count
    for qi, oi in enumerate(answers):
        if qi >= len(matrix) or oi < 0 or oi >= len(matrix[qi]):
            continue
        vec = matrix[qi][oi]
        for di in range(dim_count):
            scores[di] += vec[di] if di < len(vec) else 0
    return [int(clamp(round(v), SCORE_MIN, SCORE_MAX)) for v in scores]


def summarize_scores(scores: list[int]) -> dict:
    ordered = sorted(
        [{"score": s, "dim": i} for i, s in enumerate(scores)],
        key=lambda x: (-x["score"], x["dim"]),
    )
    top = ordered[0]
    second = ordered[1] if len(ordered) > 1 else ordered[0]
    ranks = [0] * len(scores)
    for idx, row in enumerate(ordered):
        ranks[row["dim"]] = idx + 1
    return {
        "scores": scores,
        "total": sum(scores),
        "spread": max(scores) - min(scores),
        "topDim": top["dim"],
        "topScore": top["score"],
        "secondScore": second["score"],
        "ranks": ranks,
    }


def condition_gap(cond: dict, summary: dict) -> float:
    scores = summary["scores"]
    t = cond["type"]

    if t == "min":
        return max(0.0, cond["value"] - scores[cond["dim"]])
    if t == "max_le":
        return max(0.0, scores[cond["dim"]] - cond["value"])
    if t == "max_ge":
        return max(0.0, cond["value"] - scores[cond["dim"]])
    if t == "diff_greater":
        diff = scores[cond["a"]] - scores[cond["b"]]
        return 0.0 if diff > cond["value"] else cond["value"] - diff + 1.0
    if t == "diff_abs_lte":
        diff = abs(scores[cond["a"]] - scores[cond["b"]])
        return max(0.0, diff - cond["value"])
    if t == "top_is":
        return 0.0 if summary["topDim"] == cond["dim"] else 1.0
    if t == "not_top_is":
        return 0.0 if summary["topDim"] != cond["dim"] else 1.0
    if t == "rank_is":
        return abs(summary["ranks"][cond["dim"]] - cond["rank"])
    if t == "top_diff_gte":
        diff = summary["topScore"] - summary["secondScore"]
        return max(0.0, cond["value"] - diff)
    if t == "top_diff_lte":
        diff = summary["topScore"] - summary["secondScore"]
        return max(0.0, diff - cond["value"])
    if t == "total_min":
        return max(0.0, cond["value"] - summary["total"])
    if t == "total_max":
        return max(0.0, summary["total"] - cond["value"])
    if t == "sum_min":
        subset = sum(scores[i] for i in cond["dims"])
        return max(0.0, cond["value"] - subset)
    if t == "sum_max":
        subset = sum(scores[i] for i in cond["dims"])
        return max(0.0, subset - cond["value"])
    if t == "spread_between":
        if summary["spread"] < cond["min"]:
            return cond["min"] - summary["spread"]
        if summary["spread"] > cond["max"]:
            return summary["spread"] - cond["max"]
        return 0.0
    return 1.0


def evaluate_results(summary: dict, results: list[dict]) -> dict:
    checks = []
    for res in results:
        pass_count = 0
        total_gap = 0.0
        for cond in res["conditions"]:
            gap = condition_gap(cond, summary)
            total_gap += gap
            if gap == 0:
                pass_count += 1
        checks.append(
            {
                "passed": pass_count == len(res["conditions"]),
                "passCount": pass_count,
                "totalCount": len(res["conditions"]),
                "totalGap": total_gap,
            }
        )

    standard = [
        {"i": i, "res": results[i], "chk": checks[i]}
        for i in range(len(results))
        if not results[i]["isFallback"]
    ]
    fallback = next((e for e in [
        {"i": i, "res": results[i], "chk": checks[i]} for i in range(len(results))
    ] if e["res"]["isFallback"]), None)

    eligible = sorted(
        [e for e in standard if e["chk"]["passed"]],
        key=lambda e: (-e["res"]["priority"], e["i"]),
    )
    non_fallback_eligible = len(eligible)
    if eligible:
        return {"winnerIndex": eligible[0]["i"], "checks": checks, "nonFallbackEligibleCount": non_fallback_eligible}

    near = None
    if standard:
        near = sorted(
            standard,
            key=lambda e: (
                -e["chk"]["passCount"],
                e["chk"]["totalCount"] - e["chk"]["passCount"],
                e["chk"]["totalGap"],
                -e["res"]["priority"],
                e["i"],
            ),
        )[0]

    if near and near["chk"]["passCount"] > 0:
        return {"winnerIndex": near["i"], "checks": checks, "nonFallbackEligibleCount": non_fallback_eligible}
    if fallback:
        return {"winnerIndex": fallback["i"], "checks": checks, "nonFallbackEligibleCount": non_fallback_eligible}
    return {"winnerIndex": near["i"] if near else 0, "checks": checks, "nonFallbackEligibleCount": non_fallback_eligible}


def outranks(cand_i: int, target_i: int, results: list[dict]) -> bool:
    cp = results[cand_i]["priority"]
    tp = results[target_i]["priority"]
    return cp > tp if cp != tp else cand_i < target_i


def objective_for_target(target_i: int, winner_i: int, checks: list[dict], results: list[dict]) -> float:
    if winner_i == target_i:
        return 1_000_000_000.0

    target = checks[target_i]
    blockers = 0
    for i, chk in enumerate(checks):
        if i == target_i:
            continue
        if results[i]["isFallback"] or not chk["passed"]:
            continue
        if outranks(i, target_i, results):
            blockers += 1

    passed = target["passCount"]
    failed = target["totalCount"] - target["passCount"]
    return passed * 1200.0 - failed * 1000.0 - target["totalGap"] * 85.0 - blockers * 1500.0


def search_for_target(matrix: list[list[list[int]]], target_i: int, seed: int, dim_count: int, results: list[dict]) -> dict:
    rng = random.Random(seed)
    best_answers = create_random_answers(matrix, rng)
    best_score = float("-inf")

    for restart in range(CONFIG["SEARCH_RESTARTS"]):
        current = list(best_answers) if restart == 0 else create_random_answers(matrix, rng)
        summary = summarize_scores(score_answers(dim_count, matrix, current))
        evaluated = evaluate_results(summary, results)
        current_score = objective_for_target(target_i, evaluated["winnerIndex"], evaluated["checks"], results)

        if evaluated["winnerIndex"] == target_i:
            return {"found": True, "bestScore": current_score, "bestAnswers": current}

        if current_score > best_score:
            best_score = current_score
            best_answers = list(current)

        temperature = 1.0
        for _ in range(CONFIG["SEARCH_ITERATIONS"]):
            candidate = mutate_answers(current, matrix, rng, CONFIG["ANSWER_MUTATION_SPAN"])
            s2 = summarize_scores(score_answers(dim_count, matrix, candidate))
            e2 = evaluate_results(s2, results)
            cscore = objective_for_target(target_i, e2["winnerIndex"], e2["checks"], results)

            if e2["winnerIndex"] == target_i:
                return {"found": True, "bestScore": cscore, "bestAnswers": candidate}

            if cscore > best_score:
                best_score = cscore
                best_answers = list(candidate)

            delta = cscore - current_score
            accept = math.exp(clamp(delta / max(1.0, temperature * 700.0), -60.0, 60.0))
            if delta >= 0 or rng.random() < accept:
                current = candidate
                current_score = cscore

            temperature *= 0.9997

    return {"found": False, "bestScore": best_score, "bestAnswers": best_answers}

def evaluate_reachability(matrix: list[list[list[int]]], results: list[dict], targets: list[int], dim_count: int, seed_base: int) -> dict:
    found_ids = []
    missing_ids = []
    utility = 0.0
    per_class = []

    for ti in targets:
        res = search_for_target(matrix, ti, seed_base + ti * 7919, dim_count, results)
        per_class.append({"targetIndex": ti, **res})
        class_id = results[ti]["id"]
        if res["found"]:
            found_ids.append(class_id)
            utility += REACH_SCALE
        else:
            missing_ids.append(class_id)
            utility += res["bestScore"]

    found_count = len(found_ids)
    total_count = len(targets)
    return {
        "foundCount": found_count,
        "totalCount": total_count,
        "reachability": (found_count / total_count) if total_count else 0.0,
        "utility": utility,
        "foundIds": found_ids,
        "missingIds": missing_ids,
        "classResults": per_class,
    }


def build_target_probabilities(results: list[dict], non_fallback: list[int], fallback: list[int]) -> tuple[list[float], float]:
    target = [0.0] * len(results)
    n = len(non_fallback)
    f = len(fallback)
    if n == 0:
        return target, 0.0

    fallback_total = 0.0
    if f > 0:
        # keep fallback guaranteed below non-fallback share
        max_for_lowest = 0.95 * (f / float(n + f))
        fallback_total = clamp(float(CONFIG["FALLBACK_TARGET_RATE"]), 0.0, max_for_lowest)

    non_fallback_share = (1.0 - fallback_total) / float(n)
    for i in non_fallback:
        target[i] = non_fallback_share

    if f > 0 and fallback_total > 0:
        fb_share = fallback_total / float(f)
        for i in fallback:
            target[i] = fb_share

    total = sum(target)
    if total > EPS:
        target = [x / total for x in target]
    return target, fallback_total


def estimate_probabilities(
    matrix: list[list[list[int]]],
    dim_count: int,
    results: list[dict],
    non_fallback: list[int],
    fallback: list[int],
    target_probs: list[float],
    seed: int,
) -> dict:
    rng = random.Random(seed)
    sample_count = int(CONFIG["PROBABILITY_SAMPLES"])
    counts = [0] * len(results)
    no_eligible = 0

    for _ in range(sample_count):
        answers = create_random_answers(matrix, rng)
        summary = summarize_scores(score_answers(dim_count, matrix, answers))
        ev = evaluate_results(summary, results)
        wi = ev["winnerIndex"]
        if 0 <= wi < len(counts):
            counts[wi] += 1
        if ev["nonFallbackEligibleCount"] == 0:
            no_eligible += 1

    probs = [c / float(sample_count) for c in counts]
    nf_probs = [probs[i] for i in non_fallback]
    nf_targets = [target_probs[i] for i in non_fallback]

    abs_diffs = [abs(a - b) for a, b in zip(nf_probs, nf_targets)]
    sq_diffs = [(a - b) ** 2 for a, b in zip(nf_probs, nf_targets)]
    mae = sum(abs_diffs) / float(len(abs_diffs) or 1)
    rmse = math.sqrt(sum(sq_diffs) / float(len(sq_diffs) or 1))
    max_abs = max(abs_diffs) if abs_diffs else 0.0

    fallback_rate = sum(probs[i] for i in fallback)
    fallback_target = sum(target_probs[i] for i in fallback)
    min_non_fallback = min(nf_probs) if nf_probs else 0.0

    fallback_excess = max(0.0, fallback_rate - fallback_target)
    fallback_order_violation = max(0.0, fallback_rate - min_non_fallback)
    no_eligible_rate = no_eligible / float(sample_count)
    no_eligible_penalty = no_eligible_rate * float(CONFIG["NO_ELIGIBLE_WEIGHT"])

    penalty = float(CONFIG["PROBABILITY_WEIGHT"]) * (
        mae * 1.0
        + rmse * 1.3
        + max_abs * 1.6
        + fallback_excess * 2.5
        + fallback_order_violation * 5.0
        + no_eligible_penalty
    )

    outside_target = sample_count - sum(counts[i] for i in non_fallback)

    return {
        "sampleCount": sample_count,
        "counts": counts,
        "probabilities": probs,
        "targetProbabilities": target_probs,
        "noEligibleCount": no_eligible,
        "noEligibleRate": no_eligible_rate,
        "noEligiblePenalty": no_eligible_penalty,
        "outsideTargetCount": outside_target,
        "outsideTargetRate": outside_target / float(sample_count),
        "mae": mae,
        "rmse": rmse,
        "maxAbs": max_abs,
        "fallbackRate": fallback_rate,
        "fallbackTargetRate": fallback_target,
        "minNonFallbackRate": min_non_fallback,
        "fallbackOrderViolation": fallback_order_violation,
        "penalty": penalty,
    }


def evaluate_candidate(matrix: list[list[list[int]]], dim_count: int, results: list[dict], non_fallback: list[int], fallback: list[int], target_probs: list[float], seed: int) -> dict:
    reach = evaluate_reachability(matrix, results, non_fallback, dim_count, seed)

    prob = None
    if CONFIG["OPTIMIZE_PROBABILITY"]:
        prob = estimate_probabilities(matrix, dim_count, results, non_fallback, fallback, target_probs, seed ^ 0x9E3779B9)

    score = reach["foundCount"] * 1_000_000_000_000.0 - ((prob["penalty"] if prob else 0.0) * 1_000_000_000.0) + reach["utility"]
    return {"reachability": reach, "probability": prob, "score": score}


def compare_reachability(a: dict, b: dict) -> float:
    if a["foundCount"] != b["foundCount"]:
        return a["foundCount"] - b["foundCount"]
    return a["utility"] - b["utility"]


def compare_candidate(a: dict, b: dict) -> float:
    diff = compare_reachability(a["reachability"], b["reachability"])
    if diff != 0:
        return diff
    ap = a.get("probability")
    bp = b.get("probability")
    if ap is not None and bp is not None and ap["penalty"] != bp["penalty"]:
        return bp["penalty"] - ap["penalty"]
    return a["score"] - b["score"]


def goal_met(candidate: dict) -> bool:
    if candidate["reachability"]["reachability"] < float(CONFIG["TARGET_REACHABILITY"]):
        return False
    if not CONFIG["OPTIMIZE_PROBABILITY"]:
        return True

    p = candidate.get("probability")
    if p is None:
        return True

    if p["maxAbs"] > float(CONFIG["PROBABILITY_TOLERANCE"]):
        return False
    if p["fallbackRate"] > p["fallbackTargetRate"] + EPS:
        return False
    if p["fallbackRate"] > p["minNonFallbackRate"] + EPS:
        return False
    return True


def mutate_weights(matrix: list[list[list[int]]], dim_count: int, rng: random.Random) -> None:
    if not matrix:
        return
    total = 1 + rng.randrange(max(1, int(CONFIG["WEIGHT_MUTATION_COUNT"])))
    step = int(CONFIG["WEIGHT_MUTATION_STEP"])
    limit = int(CONFIG["WEIGHT_LIMIT"])

    for _ in range(total):
        qi = rng.randrange(len(matrix))
        if not matrix[qi]:
            continue
        oi = rng.randrange(len(matrix[qi]))
        di = rng.randrange(dim_count)

        delta = 0
        while delta == 0:
            delta = rng.randint(-step, step)

        current = matrix[qi][oi][di]
        matrix[qi][oi][di] = int(clamp(round(current + delta), -limit, limit))


def pct(v: float) -> str:
    return f"{v * 100.0:.2f}%"

def tune(
    dimensions: list[str],
    questions_file: dict,
    matrix: list[list[list[int]]],
    results: list[dict],
    non_fallback: list[int],
    fallback: list[int],
    target_probs: list[float],
) -> tuple[dict, dict]:
    start = time.monotonic()
    deadline = start + float(CONFIG["MAX_SECONDS"])
    rng = random.Random(int(CONFIG["SEED"]))

    current_matrix = clone_matrix(matrix)
    current_eval = evaluate_candidate(
        current_matrix,
        len(dimensions),
        results,
        non_fallback,
        fallback,
        target_probs,
        int(CONFIG["SEED"]),
    )
    best_matrix = clone_matrix(current_matrix)
    best_eval = current_eval

    print(
        "Initial",
        f"reach={pct(best_eval['reachability']['reachability'])}",
        f"({best_eval['reachability']['foundCount']}/{best_eval['reachability']['totalCount']})",
    )

    attempt = 0
    stagnation = 0
    temperature = 1.0
    stop_reason = "unknown"

    while True:
        if goal_met(best_eval):
            stop_reason = "target_met"
            break
        if attempt >= int(CONFIG["MAX_ITERATIONS"]):
            stop_reason = "max_iterations"
            break
        if time.monotonic() >= deadline:
            stop_reason = "max_seconds"
            break
        if stagnation >= int(CONFIG["STAGNATION_PATIENCE"]):
            stop_reason = "stagnation_patience"
            break

        attempt += 1
        candidate_matrix = clone_matrix(current_matrix)
        mutate_weights(candidate_matrix, len(dimensions), rng)

        candidate_eval = evaluate_candidate(
            candidate_matrix,
            len(dimensions),
            results,
            non_fallback,
            fallback,
            target_probs,
            int(CONFIG["SEED"]) + attempt * 97,
        )

        better_current = compare_candidate(candidate_eval, current_eval) > 0
        delta = candidate_eval["score"] - current_eval["score"]
        accept = math.exp(clamp(delta / max(1.0, temperature * 1_000_000_000.0), -60.0, 60.0))
        if better_current or rng.random() < accept:
            current_matrix = candidate_matrix
            current_eval = candidate_eval

        if compare_candidate(candidate_eval, best_eval) > 0:
            best_matrix = clone_matrix(candidate_matrix)
            best_eval = candidate_eval
            stagnation = 0
            elapsed = time.monotonic() - start
            print(
                f"Improved @{elapsed:.1f}s attempt={attempt}",
                f"reach={pct(best_eval['reachability']['reachability'])}",
            )
            if best_eval.get("probability"):
                p = best_eval["probability"]
                print(
                    f"dist mae={pct(p['mae'])} rmse={pct(p['rmse'])} maxAbs={pct(p['maxAbs'])}",
                    f"fallback={pct(p['fallbackRate'])} noEligible={pct(p['noEligibleRate'])}",
                )
        else:
            stagnation += 1
            if attempt % int(CONFIG["LOG_EVERY"]) == 0:
                elapsed = time.monotonic() - start
                print(
                    f"Progress @{elapsed:.1f}s attempt={attempt}",
                    f"bestReach={pct(best_eval['reachability']['reachability'])}",
                    f"stagnation={stagnation}/{int(CONFIG['STAGNATION_PATIENCE'])}",
                )

        temperature *= 0.997

    reached = goal_met(best_eval)
    use_best = reached or bool(CONFIG["WRITE_BEST_IF_NOT_MET"])
    final_matrix = best_matrix if use_best else matrix
    final_eval = best_eval if use_best else current_eval

    tuned_questions = matrix_to_questions_file(questions_file, final_matrix, dimensions)
    summary = {
        "stoppedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "elapsedSeconds": time.monotonic() - start,
        "stopReason": stop_reason,
        "attempts": attempt,
        "reachedTarget": reached,
        "selectionMode": "best_candidate" if use_best else "original_matrix",
        "targetReachability": CONFIG["TARGET_REACHABILITY"],
        "probabilityTolerance": CONFIG["PROBABILITY_TOLERANCE"],
        "best": final_eval,
    }
    return tuned_questions, summary


def main() -> None:
    dims_payload, questions_payload, results_payload = read_json_payloads()

    dimensions = [d["id"] for d in dims_payload.get("dimensions", [])]
    if not dimensions:
        raise ValueError("No dimensions found.")

    raw_results = results_payload.get("results", [])
    if not raw_results:
        raise ValueError("No results found.")

    dim_index = {d: i for i, d in enumerate(dimensions)}
    results = []
    for r in raw_results:
        results.append(
            {
                "id": r["id"],
                "priority": int(r.get("priority", 0)),
                "isFallback": bool(r.get("isFallback", False)),
                "conditions": [normalize_condition(c, dim_index) for c in r.get("conditions", [])],
            }
        )

    questions = questions_payload.get("questions", [])
    if not questions:
        raise ValueError("No questions found.")

    matrix = questions_to_matrix(questions, dimensions)
    if any(len(q) == 0 for q in matrix):
        raise ValueError("Every question must have at least one option.")

    non_fallback = [i for i, r in enumerate(results) if not r["isFallback"]]
    fallback = [i for i, r in enumerate(results) if r["isFallback"]]
    if not non_fallback:
        raise ValueError("No non-fallback classes found.")

    target_probs, fallback_target = build_target_probabilities(results, non_fallback, fallback)
    target_map = {results[i]["id"]: target_probs[i] for i in range(len(results))}

    print("Tuner started")
    print(
        "mode=" + ("dataiku" if is_dataiku_mode() else "local"),
        f"targetReach={pct(float(CONFIG['TARGET_REACHABILITY']))}",
        f"maxSeconds={CONFIG['MAX_SECONDS']}",
        f"maxIterations={CONFIG['MAX_ITERATIONS']}",
        f"stagnationPatience={CONFIG['STAGNATION_PATIENCE']}",
    )
    print(f"targetFallbackRate={pct(fallback_target)}")
    print("targetDistributionByClass=", json.dumps(target_map, indent=2))

    tuned_questions, summary = tune(
        dimensions,
        questions_payload,
        matrix,
        results,
        non_fallback,
        fallback,
        target_probs,
    )

    best = summary["best"]
    print(
        "Best",
        f"reach={pct(best['reachability']['reachability'])}",
        f"stopReason={summary['stopReason']}",
        f"reachedTarget={summary['reachedTarget']}",
    )
    if best.get("probability"):
        p = best["probability"]
        print(
            f"distribution mae={pct(p['mae'])} rmse={pct(p['rmse'])} maxAbs={pct(p['maxAbs'])}",
            f"fallback={pct(p['fallbackRate'])} minNonFallback={pct(p['minNonFallbackRate'])} noEligible={pct(p['noEligibleRate'])}",
        )

    write_outputs(tuned_questions, summary)

    if is_dataiku_mode():
        print(f"Wrote {CONFIG['OUTPUT_QUESTIONS_FILE']} and {CONFIG['OUTPUT_SUMMARY_FILE']} to {CONFIG['OUTPUT_FOLDER_ID']}")
    else:
        print(f"Wrote outputs to {CONFIG['LOCAL_OUTPUT_DIR']}")


if __name__ == "__main__":
    main()
