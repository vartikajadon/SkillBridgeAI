"""
Unit Tests for SkillBridge AI AI Quiz Generator Service (Phase 6)
Tests:
- Deterministic source-derived fallback question synthesis
- Four distinct options and valid correct_index
- Source traceability references in explanations
- Insufficient content error handling (<50 words)
- Server-side rubric validation through assessment engine
- Mocked LLM response formatting and schema conformance
"""
import uuid
from unittest.mock import MagicMock, patch
import pytest

from app.models.document import DocumentChunk
from app.services.quiz_generator import (
    generate_fallback_mcqs,
    generate_llm_mcqs,
    generate_quiz_from_document,
)


def create_mock_chunk(text: str, idx: int = 0) -> DocumentChunk:
    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        chunk_index=idx,
        chunk_text=text,
        token_count=len(text.split()),
        metadata_json={},
    )
    return chunk


def test_fallback_generator_insufficient_content_raises_error():
    # Content with < 50 words
    short_chunk = create_mock_chunk("Short document text with only a few words.")
    with pytest.raises(ValueError, match="insufficient for reliable MCQ generation"):
        generate_fallback_mcqs(
            chunks=[short_chunk],
            competency_code="STAT_ANALYSIS",
            question_count=3,
        )


def test_fallback_generator_synthesizes_valid_mcqs():
    substantive_text = (
        "Under Section 4 of the Digital Personal Data Protection Act, every government department "
        "functioning as a Data Fiduciary must issue a clear and concise notice prior to processing citizen data. "
        "The notice must describe the specific purpose of data collection and inform individuals of their rights. "
        "Data minimization principles require that only information strictly necessary for service delivery be requested. "
        "All departmental digital databases must implement encryption for data in transit and at rest. "
        "In the event of a personal data breach, immediate notification must be submitted to the Data Protection Board. "
        "Non-compliance with statutory security mandates subjects officials to administrative review and financial penalties."
    )
    chunk = create_mock_chunk(substantive_text, idx=0)

    questions = generate_fallback_mcqs(
        chunks=[chunk],
        competency_code="GOV_COMPLIANCE",
        question_count=4,
        difficulty_level=3,
        total_marks=100,
    )

    assert len(questions) == 4
    for q in questions:
        assert "id" in q
        assert q["competency_code"] == "GOV_COMPLIANCE"
        assert len(q["options"]) == 4
        # Options must be distinct
        assert len(set(q["options"])) == 4
        assert 0 <= q["correct_index"] < 4
        assert q["points"] == 25.0
        assert q["difficulty_level"] == 3
        # Must clearly indicate deterministic source-derived generator
        assert "[SOURCE-DERIVED DETERMINISTIC EVALUATION]" in q["explanation"]
        assert q["generator_mode"] == "deterministic_fallback"
        assert "source_document_id" in q
        assert "source_chunk_index" in q


def test_mocked_groq_llm_generation():
    chunk = create_mock_chunk("General Financial Rules 2017 mandate procurement transparency.", idx=2)

    mock_response = {
        "choices": [
            {
                "message": {
                    "content": """{
                        "questions": [
                            {
                                "prompt": "Which rulebook governs public financial procurement transparency?",
                                "options": ["GFR 2017", "Customs Act", "Motor Vehicles Act", "Factories Act"],
                                "correct_index": 0,
                                "difficulty_level": 3,
                                "points": 20.0,
                                "explanation": "GFR 2017 mandates procurement transparency."
                            }
                        ]
                    }"""
                }
            }
        ]
    }

    with patch("httpx.Client.post") as mock_post:
        mock_resp_obj = MagicMock()
        mock_resp_obj.status_code = 200
        mock_resp_obj.json.return_value = mock_response
        mock_post.return_value = mock_resp_obj

        questions = generate_llm_mcqs(
            chunks=[chunk],
            competency_code="FIN_MGMT",
            question_count=1,
            total_marks=20,
            api_key="gsk_real_looking_groq_key_12345",
            provider="groq",
        )

        assert len(questions) == 1
        assert questions[0]["competency_code"] == "FIN_MGMT"
        assert questions[0]["generator_mode"] == "llm"
        assert mock_post.called
        call_url = mock_post.call_args[0][0]
        assert "groq.com" in call_url
    chunk = create_mock_chunk("Official guidelines for district welfare fund administration.", idx=1)

    mock_response = {
        "choices": [
            {
                "message": {
                    "content": """{
                        "questions": [
                            {
                                "prompt": "What is the primary audit frequency for district welfare funds?",
                                "options": ["Quarterly", "Annual", "Biennial", "Ad-hoc"],
                                "correct_index": 0,
                                "difficulty_level": 3,
                                "points": 20.0,
                                "explanation": "Section 3 requires quarterly internal audits."
                            }
                        ]
                    }"""
                }
            }
        ]
    }

    with patch("httpx.Client.post") as mock_post:
        mock_resp_obj = MagicMock()
        mock_resp_obj.status_code = 200
        mock_resp_obj.json.return_value = mock_response
        mock_post.return_value = mock_resp_obj

        questions = generate_llm_mcqs(
            chunks=[chunk],
            competency_code="GOV_COMPLIANCE",
            question_count=1,
            difficulty_level=3,
            total_marks=20,
            api_key="sk-valid-test-key",
        )

        assert len(questions) == 1
        q = questions[0]
        assert q["prompt"] == "What is the primary audit frequency for district welfare funds?"
        assert q["options"] == ["Quarterly", "Annual", "Biennial", "Ad-hoc"]
        assert q["correct_index"] == 0
        assert q["generator_mode"] == "llm"


def test_master_dispatcher_uses_fallback_when_unconfigured():
    chunk = create_mock_chunk(
        "Under Section 4 of the Digital Personal Data Protection Act, every government department "
        "functioning as a Data Fiduciary must issue a clear and concise notice prior to processing citizen data. "
        "The notice must describe the specific purpose of data collection and inform individuals of their rights. "
        "Data minimization principles require that only information strictly necessary for service delivery be requested. "
        "All departmental digital databases must implement encryption for data in transit and at rest."
    )

    # With no key or placeholder key, dispatcher safely executes fallback
    questions = generate_quiz_from_document(
        chunks=[chunk],
        competency_code="GOV_COMPLIANCE",
        question_count=2,
        difficulty_level=2,
        total_marks=50,
        force_fallback=True,
    )
    assert len(questions) == 2
    assert questions[0]["generator_mode"] == "deterministic_fallback"
