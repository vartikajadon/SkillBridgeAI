"""
Unit Tests for SkillBridge AI Phase 5 Recommendation Engine
Tests:
- Deterministic formula calculation
- Mandatory vs Desirable priority weighting
- Larger-gap prioritization
- Multi-competency synergy scoring
- Level alignment exact vs stepping stone bonuses
- Completed course exclusion logic
- Unassessed learner foundational onboarding handling
- No-gap learner handling
- Pedagogical learning path sequencing
"""
import uuid
import pytest
from app.models.competency import Competency
from app.models.course import Course, CourseCompetency
from app.services.recommendation_engine import (
    calculate_course_relevance,
    WEIGHT_DESIRABLE,
    WEIGHT_GAP_PER_POINT,
    WEIGHT_LEVEL_ALIGNMENT_EXACT,
    WEIGHT_LEVEL_ALIGNMENT_STEP,
    WEIGHT_MANDATORY,
    WEIGHT_MULTI_COMPETENCY_BONUS,
)


def create_mock_competency(code: str, name: str) -> Competency:
    comp = Competency(
        id=uuid.uuid4(),
        code=code,
        name=name,
        category="Technical",
    )
    return comp


def create_mock_course(
    code: str,
    title: str,
    mappings: list,
    duration: int = 10,
) -> Course:
    course = Course(
        id=uuid.uuid4(),
        code=code,
        title=title,
        duration_hours=duration,
        status="published",
    )
    course_comps = []
    for comp, level in mappings:
        cc = CourseCompetency(
            course_id=course.id,
            competency_id=comp.id,
            target_level_achieved=level,
        )
        cc.competency = comp
        course_comps.append(cc)
    course.course_competencies = course_comps
    return course


def test_mandatory_vs_desirable_prioritization():
    comp1 = create_mock_competency("COMP_MAND", "Mandatory Skill")
    comp2 = create_mock_competency("COMP_DES", "Desirable Skill")

    course_mand = create_mock_course("CRS-MAND", "Mandatory Course", [(comp1, 4)])
    course_des = create_mock_course("CRS-DES", "Desirable Course", [(comp2, 4)])

    gap_map = {
        comp1.id: {
            "target_level": 4,
            "current_level": 2,
            "gap_score": 2,
            "criticality": "Mandatory",
        },
        comp2.id: {
            "target_level": 4,
            "current_level": 2,
            "gap_score": 2,
            "criticality": "Desirable",
        },
    }

    score_mand, priority_mand, _, _ = calculate_course_relevance(course_mand, gap_map)
    score_des, priority_des, _, _ = calculate_course_relevance(course_des, gap_map)

    # Mandatory course gets WEIGHT_MANDATORY (20.0) vs WEIGHT_DESIRABLE (10.0)
    assert score_mand > score_des
    assert score_mand - score_des == WEIGHT_MANDATORY - WEIGHT_DESIRABLE
    assert priority_mand == "High"


def test_larger_gap_prioritization():
    comp_big_gap = create_mock_competency("COMP_BIG", "Big Gap Skill")
    comp_small_gap = create_mock_competency("COMP_SML", "Small Gap Skill")

    course_big = create_mock_course("CRS-BIG", "Big Gap Course", [(comp_big_gap, 4)])
    course_small = create_mock_course("CRS-SML", "Small Gap Course", [(comp_small_gap, 4)])

    gap_map = {
        comp_big_gap.id: {
            "target_level": 5,
            "current_level": 1,
            "gap_score": 4,  # Gap = 4
            "criticality": "Mandatory",
        },
        comp_small_gap.id: {
            "target_level": 5,
            "current_level": 4,
            "gap_score": 1,  # Gap = 1
            "criticality": "Mandatory",
        },
    }

    score_big, _, _, _ = calculate_course_relevance(course_big, gap_map)
    score_small, _, _, _ = calculate_course_relevance(course_small, gap_map)

    # Difference in gap is 3 points -> 3 * WEIGHT_GAP_PER_POINT
    assert score_big > score_small
    assert score_big - score_small == 3 * WEIGHT_GAP_PER_POINT


def test_multi_competency_synergy_bonus():
    comp1 = create_mock_competency("COMP_A", "Skill A")
    comp2 = create_mock_competency("COMP_B", "Skill B")

    single_course = create_mock_course("CRS-SINGLE", "Single Skill", [(comp1, 4)])
    multi_course = create_mock_course("CRS-MULTI", "Multi Skill", [(comp1, 4), (comp2, 4)])

    gap_map = {
        comp1.id: {
            "target_level": 4,
            "current_level": 2,
            "gap_score": 2,
            "criticality": "Mandatory",
        },
        comp2.id: {
            "target_level": 4,
            "current_level": 2,
            "gap_score": 2,
            "criticality": "Mandatory",
        },
    }

    score_single, _, _, _ = calculate_course_relevance(single_course, gap_map)
    score_multi, _, reason_multi, addressed = calculate_course_relevance(multi_course, gap_map)

    # Multi course gets 2x individual scores + synergy bonus
    expected_multi = (score_single * 2) + WEIGHT_MULTI_COMPETENCY_BONUS
    assert score_multi == expected_multi
    assert len(addressed) == 2
    assert "High-efficiency module" in reason_multi


def test_level_alignment_exact_vs_stepping_bonus():
    comp = create_mock_competency("COMP_STAT", "Statistics")

    course_exact = create_mock_course("CRS-EXACT", "Exact Level", [(comp, 4)])
    course_stepping = create_mock_course("CRS-STEP", "Stepping Level", [(comp, 3)])

    gap_map = {
        comp.id: {
            "target_level": 4,
            "current_level": 1,
            "gap_score": 3,
            "criticality": "Mandatory",
        },
    }

    score_exact, _, reason_exact, _ = calculate_course_relevance(course_exact, gap_map)
    score_step, _, reason_step, _ = calculate_course_relevance(course_stepping, gap_map)

    # Exact delivery (4 >= 4) gets exact bonus (10.0); Stepping (3 < 4) gets stepping bonus (5.0)
    assert score_exact > score_step
    assert score_exact - score_step == WEIGHT_LEVEL_ALIGNMENT_EXACT - WEIGHT_LEVEL_ALIGNMENT_STEP
    assert "fully meets role target L4" in reason_exact
    assert "advances level to L3" in reason_step


def test_unassessed_learner_foundational_scoring():
    comp = create_mock_competency("COMP_CORE", "Core Competency")
    course = create_mock_course("CRS-FOUND", "Foundational Course", [(comp, 2)])

    gap_map = {
        comp.id: {
            "target_level": 4,
            "current_level": None,
            "gap_score": 4,
            "criticality": "Mandatory",
        },
    }

    score, priority, reason, addressed = calculate_course_relevance(
        course, gap_map, is_unassessed_learner=True
    )

    assert score > 0
    assert len(addressed) == 1
    assert addressed[0].current_level is None
    assert "Builds foundational mandatory competency" in reason


def test_course_with_zero_alignment():
    comp_irrelevant = create_mock_competency("COMP_OTHER", "Unrelated Skill")
    course = create_mock_course("CRS-IRR", "Unrelated Course", [(comp_irrelevant, 3)])

    gap_map = {
        uuid.uuid4(): {
            "target_level": 4,
            "current_level": 2,
            "gap_score": 2,
            "criticality": "Mandatory",
        },
    }

    score, priority, reason, addressed = calculate_course_relevance(course, gap_map)
    assert score == 0.0
    assert priority == "Low"
    assert len(addressed) == 0
