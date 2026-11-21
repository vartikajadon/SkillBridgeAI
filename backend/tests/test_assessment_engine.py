"""
Unit Tests for SkillBridge AI Centralized Assessment Scoring & Gap Analysis Engine
Tests MCQ grading, boundary conditions, competency aggregation, skill gaps,
prioritization, sanitization, and defensive input validation.
"""
import pytest
from app.services.assessment_engine import (
    AssessmentResult,
    CompetencyEvaluation,
    QuestionEvaluation,
    calculate_skill_gap,
    evaluate_assessment,
    map_percentage_to_level,
    prioritize_gap_items,
    sanitize_questions_for_client,
    validate_quiz_definition,
)

SAMPLE_QUESTIONS = [
    {
        "id": "q1",
        "competency_code": "STAT_ANALYSIS",
        "difficulty_level": 2,
        "points": 10,
        "prompt": "Which metric is most robust to positive skewness?",
        "options": ["Mean", "Median", "Mode", "Variance"],
        "correct_index": 1,
        "explanation": "Median is insensitive to extreme high outliers.",
    },
    {
        "id": "q2",
        "competency_code": "STAT_ANALYSIS",
        "difficulty_level": 4,
        "points": 10,
        "prompt": "What technique reduces selection bias in observational data?",
        "options": ["OLS", "Propensity Score Matching", "K-Means", "PCA"],
        "correct_index": 1,
        "explanation": "Propensity score matching creates balanced comparison groups.",
    },
    {
        "id": "q3",
        "competency_code": "SQL_DATABASE",
        "difficulty_level": 2,
        "points": 10,
        "prompt": "Which clause filters grouped aggregates?",
        "options": ["WHERE", "HAVING", "LIMIT", "OFFSET"],
        "correct_index": 1,
        "explanation": "HAVING filters groups post-aggregation.",
    },
    {
        "id": "q4",
        "competency_code": "SQL_DATABASE",
        "difficulty_level": 4,
        "points": 10,
        "prompt": "Which window function does NOT skip ranks after ties?",
        "options": ["RANK()", "DENSE_RANK()", "ROW_NUMBER()", "NTILE()"],
        "correct_index": 1,
        "explanation": "DENSE_RANK() yields consecutive rank integers without gaps.",
    },
]


# ==============================================================================
# 1. Answer Evaluation & Score Calculations
# ==============================================================================

def test_all_correct_answers_full_score():
    answers = {"q1": 1, "q2": 1, "q3": 1, "q4": 1}
    result = evaluate_assessment(SAMPLE_QUESTIONS, answers, passing_marks=30.0)

    assert result.total_score == 40.0
    assert result.max_score == 40.0
    assert result.percentage == 100.0
    assert result.passed is True
    assert len(result.questions) == 4
    for q in result.questions:
        assert q.is_correct is True
        assert q.points_earned == 10.0


def test_all_incorrect_answers_zero_score():
    answers = {"q1": 0, "q2": 0, "q3": 0, "q4": 0}
    result = evaluate_assessment(SAMPLE_QUESTIONS, answers, passing_marks=20.0)

    assert result.total_score == 0.0
    assert result.percentage == 0.0
    assert result.passed is False
    for q in result.questions:
        assert q.is_correct is False
        assert q.points_earned == 0.0


def test_mixed_answers_and_partial_score():
    answers = {"q1": 1, "q2": 0, "q3": 1, "q4": 0}  # q1 & q3 correct (20/40 = 50%)
    result = evaluate_assessment(SAMPLE_QUESTIONS, answers, passing_marks=25.0)

    assert result.total_score == 20.0
    assert result.max_score == 40.0
    assert result.percentage == 50.0
    assert result.passed is False  # 20 < 25


def test_missing_and_unanswered_questions():
    # Only q1 answered correctly, q2, q3, q4 omitted
    answers = {"q1": 1}
    result = evaluate_assessment(SAMPLE_QUESTIONS, answers, passing_marks=10.0)

    assert result.total_score == 10.0
    assert result.percentage == 25.0
    assert result.passed is True

    # Check question-level audit
    q_map = {q.question_id: q for q in result.questions}
    assert q_map["q1"].is_correct is True
    assert q_map["q2"].selected_index is None
    assert q_map["q2"].is_correct is False
    assert q_map["q2"].points_earned == 0.0


# ==============================================================================
# 2. Competency-wise Aggregation & Untested Isolation
# ==============================================================================

def test_multiple_competencies_aggregated_independently():
    # STAT: q1 (correct), q2 (incorrect) -> 10/20 = 50.0% -> Level 2
    # SQL: q3 (correct), q4 (correct) -> 20/20 = 100.0% -> Level 5
    answers = {"q1": 1, "q2": 0, "q3": 1, "q4": 1}
    role_benchmarks = {
        "STAT_ANALYSIS": {"target_level": 4, "criticality": "Mandatory"},
        "SQL_DATABASE": {"target_level": 4, "criticality": "Mandatory"},
    }

    result = evaluate_assessment(SAMPLE_QUESTIONS, answers, role_benchmarks=role_benchmarks)

    assert len(result.competency_results) == 2
    stat_eval = result.competency_results["STAT_ANALYSIS"]
    sql_eval = result.competency_results["SQL_DATABASE"]

    assert stat_eval.earned_points == 10.0
    assert stat_eval.total_points == 20.0
    assert stat_eval.percentage == 50.0
    assert stat_eval.current_level == 2
    assert stat_eval.gap_score == 2  # target 4 - current 2

    assert sql_eval.earned_points == 20.0
    assert sql_eval.total_points == 20.0
    assert sql_eval.percentage == 100.0
    assert sql_eval.current_level == 5
    assert sql_eval.gap_score == 0  # target 4 - current 5 -> clamped to 0
    assert sql_eval.is_strength is True


def test_untested_competencies_not_evaluated_as_level_1():
    """Verify that competencies not tested in this assessment are completely omitted
    and never default to Level 1.
    """
    answers = {"q1": 1, "q2": 1, "q3": 1, "q4": 1}
    # Role requires AI_GOVERNANCE and GOV_COMPLIANCE, but they are not in SAMPLE_QUESTIONS
    role_benchmarks = {
        "STAT_ANALYSIS": {"target_level": 4, "criticality": "Mandatory"},
        "SQL_DATABASE": {"target_level": 4, "criticality": "Mandatory"},
        "AI_GOVERNANCE": {"target_level": 3, "criticality": "Desirable"},
        "GOV_COMPLIANCE": {"target_level": 3, "criticality": "Mandatory"},
    }

    result = evaluate_assessment(SAMPLE_QUESTIONS, answers, role_benchmarks=role_benchmarks)

    # Only tested competencies appear in competency_results
    assert set(result.competency_results.keys()) == {"STAT_ANALYSIS", "SQL_DATABASE"}
    assert "AI_GOVERNANCE" not in result.competency_results
    assert "GOV_COMPLIANCE" not in result.competency_results


# ==============================================================================
# 3. Proficiency Level Mapping Boundaries
# ==============================================================================

@pytest.mark.parametrize(
    "percentage,expected_level",
    [
        (-5.0, 1),
        (0.0, 1),
        (39.9, 1),
        (40.0, 2),  # Boundary 1
        (50.0, 2),
        (59.9, 2),
        (60.0, 3),  # Boundary 2
        (70.0, 3),
        (74.9, 3),
        (75.0, 4),  # Boundary 3
        (85.0, 4),
        (89.9, 4),
        (90.0, 5),  # Boundary 4
        (95.0, 5),
        (100.0, 5),
        (105.0, 5),
    ],
)
def test_proficiency_level_boundaries(percentage, expected_level):
    assert map_percentage_to_level(percentage) == expected_level


# ==============================================================================
# 4. Skill Gap Calculation & Prioritization
# ==============================================================================

def test_skill_gap_calculation():
    assert calculate_skill_gap(current_level=2, target_level=4) == 2
    assert calculate_skill_gap(current_level=3, target_level=3) == 0
    assert calculate_skill_gap(current_level=5, target_level=3) == 0  # Clamped at 0
    assert calculate_skill_gap(current_level=1, target_level=5) == 4


def test_gap_prioritization_mandatory_before_desirable_and_gap_magnitude():
    items = [
        CompetencyEvaluation("COMP_D_SMALL", 0, 0, 0, 3, target_level=4, gap_score=1, criticality="Desirable"),
        CompetencyEvaluation("COMP_M_SMALL", 0, 0, 0, 3, target_level=4, gap_score=1, criticality="Mandatory"),
        CompetencyEvaluation("COMP_D_LARGE", 0, 0, 0, 1, target_level=4, gap_score=3, criticality="Desirable"),
        CompetencyEvaluation("COMP_M_LARGE", 0, 0, 0, 2, target_level=4, gap_score=2, criticality="Mandatory"),
        CompetencyEvaluation("COMP_MET", 0, 0, 0, 4, target_level=4, gap_score=0, criticality="Mandatory"),
    ]

    prioritized = prioritize_gap_items(items)

    # COMP_MET should be omitted (gap_score == 0)
    assert len(prioritized) == 4

    # Order must be:
    # 1. COMP_M_LARGE (Mandatory, gap 2)
    # 2. COMP_M_SMALL (Mandatory, gap 1)
    # 3. COMP_D_LARGE (Desirable, gap 3)
    # 4. COMP_D_SMALL (Desirable, gap 1)
    ordered_codes = [p.competency_code for p in prioritized]
    assert ordered_codes == [
        "COMP_M_LARGE",
        "COMP_M_SMALL",
        "COMP_D_LARGE",
        "COMP_D_SMALL",
    ]


# ==============================================================================
# 5. Question Sanitization Helper
# ==============================================================================

def test_sanitize_questions_for_client_strips_keys():
    sanitized = sanitize_questions_for_client(SAMPLE_QUESTIONS)

    assert len(sanitized) == 4
    for q in sanitized:
        assert "correct_index" not in q
        assert "explanation" not in q
        assert "prompt" in q
        assert "options" in q
        assert "competency_code" in q
        assert "points" in q
        assert len(q["options"]) == 4


# ==============================================================================
# 6. Defensive Validation & Input Rejections
# ==============================================================================

def test_invalid_question_id_rejected():
    answers = {"q1": 1, "non_existent_question": 0}
    with pytest.raises(ValueError, match="Unknown question ID 'non_existent_question'"):
        evaluate_assessment(SAMPLE_QUESTIONS, answers)


def test_invalid_option_index_negative_rejected():
    answers = {"q1": -1}
    with pytest.raises(ValueError, match="Invalid option index \\(-1\\)"):
        evaluate_assessment(SAMPLE_QUESTIONS, answers)


def test_invalid_option_index_out_of_bounds_rejected():
    answers = {"q1": 4}  # q1 has 4 options: indices 0..3
    with pytest.raises(ValueError, match="Invalid option index \\(4\\)"):
        evaluate_assessment(SAMPLE_QUESTIONS, answers)


def test_malformed_quiz_definitions_rejected():
    # Empty list
    with pytest.raises(ValueError, match="non-empty list"):
        validate_quiz_definition([])

    # Duplicate question ID
    dup = [
        {"id": "same_id", "prompt": "P1", "competency_code": "C1", "options": ["A", "B"], "correct_index": 0, "points": 10},
        {"id": "same_id", "prompt": "P2", "competency_code": "C1", "options": ["A", "B"], "correct_index": 0, "points": 10},
    ]
    with pytest.raises(ValueError, match="Duplicate question ID"):
        validate_quiz_definition(dup)

    # Missing competency code
    missing_comp = [
        {"id": "q1", "prompt": "P1", "options": ["A", "B"], "correct_index": 0, "points": 10}
    ]
    with pytest.raises(ValueError, match="missing valid 'competency_code'"):
        validate_quiz_definition(missing_comp)

    # Less than 2 options
    one_opt = [
        {"id": "q1", "prompt": "P1", "competency_code": "C1", "options": ["A"], "correct_index": 0, "points": 10}
    ]
    with pytest.raises(ValueError, match="at least 2 options"):
        validate_quiz_definition(one_opt)

    # Invalid correct_index
    bad_correct = [
        {"id": "q1", "prompt": "P1", "competency_code": "C1", "options": ["A", "B"], "correct_index": 5, "points": 10}
    ]
    with pytest.raises(ValueError, match="invalid 'correct_index'"):
        validate_quiz_definition(bad_correct)

    # Non-positive points
    zero_pts = [
        {"id": "q1", "prompt": "P1", "competency_code": "C1", "options": ["A", "B"], "correct_index": 0, "points": 0}
    ]
    with pytest.raises(ValueError, match="points' greater than 0"):
        validate_quiz_definition(zero_pts)
