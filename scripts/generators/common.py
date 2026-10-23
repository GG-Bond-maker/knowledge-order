# -*- coding: utf-8 -*-
"""
Helper library for generating structured course content in JSON format.
Ensures 100% compliance with Knowledge Order schema & TypeScript types.
"""

import json
import os
from typing import List, Dict, Any, Optional

def tip(text: str, kind: str = "pitfall") -> Dict[str, str]:
    """kind: 'pitfall' | 'leak' | 'interview' | 'performance' | 'note'"""
    return {"kind": kind, "text": text}

def demo(code: str, lang: str = "python", title: Optional[str] = None, dataset: Optional[str] = None) -> Dict[str, Any]:
    res = {"lang": lang, "code": code}
    if title:
        res["title"] = title
    if dataset:
        res["dataset"] = dataset
    return res

def lesson(
    lesson_id: str,
    title: str,
    content: str,
    difficulty: int = 1,
    tips: Optional[List[Dict[str, str]]] = None,
    demos: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    item = {
        "id": lesson_id,
        "title": title,
        "content": content.strip(),
        "difficulty": difficulty,
    }
    if tips:
        item["tips"] = tips
    if demos:
        item["demos"] = demos
    return item

def single_choice(
    ex_id: str,
    question: str,
    options: List[Dict[str, str]],
    answer: str,
    explanation: str,
    difficulty: int = 1,
    related_lesson_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    assert any(o["value"] == answer for o in options), f"Answer {answer} not in options for {ex_id}"
    res = {
        "id": ex_id,
        "type": "single",
        "difficulty": difficulty,
        "question": question.strip(),
        "options": options,
        "answer": answer,
        "explanation": explanation.strip(),
    }
    if related_lesson_id:
        res["relatedLessonId"] = related_lesson_id
    if tags:
        res["tags"] = tags
    return res

def multiple_choice(
    ex_id: str,
    question: str,
    options: List[Dict[str, str]],
    answer: List[str],
    explanation: str,
    difficulty: int = 3,
    related_lesson_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    assert len(answer) > 0, f"Empty answer for {ex_id}"
    for a in answer:
        assert any(o["value"] == a for o in options), f"Answer {a} not in options for {ex_id}"
    res = {
        "id": ex_id,
        "type": "multiple",
        "difficulty": difficulty,
        "question": question.strip(),
        "options": options,
        "answer": sorted(answer),
        "explanation": explanation.strip(),
    }
    if related_lesson_id:
        res["relatedLessonId"] = related_lesson_id
    if tags:
        res["tags"] = tags
    return res

def judge(
    ex_id: str,
    question: str,
    answer: bool,
    explanation: str,
    difficulty: int = 1,
    related_lesson_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    res = {
        "id": ex_id,
        "type": "judge",
        "difficulty": difficulty,
        "question": question.strip(),
        "answer": answer,
        "explanation": explanation.strip(),
    }
    if related_lesson_id:
        res["relatedLessonId"] = related_lesson_id
    if tags:
        res["tags"] = tags
    return res

def fill(
    ex_id: str,
    question: str,
    blanks: List[List[str]],
    explanation: str,
    difficulty: int = 2,
    related_lesson_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    assert len(blanks) > 0 and all(len(b) > 0 for b in blanks), f"Empty blanks for {ex_id}"
    res = {
        "id": ex_id,
        "type": "fill",
        "difficulty": difficulty,
        "question": question.strip(),
        "blanks": blanks,
        "explanation": explanation.strip(),
    }
    if related_lesson_id:
        res["relatedLessonId"] = related_lesson_id
    if tags:
        res["tags"] = tags
    return res

def open_ex(
    ex_id: str,
    question: str,
    reference_answer: str,
    explanation: str,
    rubric: List[Dict[str, Any]],
    exemplar: Optional[str] = None,
    difficulty: int = 4,
    related_lesson_id: Optional[str] = None,
    tags: Optional[List[str]] = None,
) -> Dict[str, Any]:
    assert len(rubric) > 0, f"Empty rubric for {ex_id}"
    res = {
        "id": ex_id,
        "type": "open",
        "difficulty": difficulty,
        "question": question.strip(),
        "referenceAnswer": reference_answer.strip(),
        "explanation": explanation.strip(),
        "rubric": rubric,
    }
    if exemplar:
        res["exemplar"] = exemplar.strip()
    else:
        res["exemplar"] = reference_answer.strip()
    if related_lesson_id:
        res["relatedLessonId"] = related_lesson_id
    if tags:
        res["tags"] = tags
    return res

def chapter(
    chapter_id: str,
    course_id: str,
    order: int,
    title: str,
    goal: str,
    lessons: List[Dict[str, Any]],
    exercises: List[Dict[str, Any]],
) -> Dict[str, Any]:
    return {
        "id": chapter_id,
        "courseId": course_id,
        "order": order,
        "title": title,
        "goal": goal,
        "lessons": lessons,
        "exercises": exercises,
    }

def course(
    course_id: str,
    title: str,
    subtitle: str,
    description: str,
    icon: str,
    color: str,
    domain_id: str,
    prerequisites: List[str],
    target_audience: str,
    estimated_hours: int,
    chapters: List[Dict[str, Any]],
    series_id: Optional[str] = None,
) -> Dict[str, Any]:
    c = {
        "id": course_id,
        "title": title,
        "subtitle": subtitle,
        "description": description,
        "icon": icon,
        "color": color,
        "domainId": domain_id,
        "prerequisites": prerequisites,
        "targetAudience": target_audience,
        "estimatedHours": estimated_hours,
        "source": "builtin",
        "chapters": chapters,
    }
    if series_id:
        c["seriesId"] = series_id
    return c

def validate_and_save(course_dict: Dict[str, Any], filepath: str) -> None:
    """Validate completeness and schema conformity, then write out UTF-8 JSON."""
    cid = course_dict["id"]
    all_ids = set()
    all_ids.add(cid)
    
    total_lessons = 0
    total_exercises = 0
    tier_counts = {"basic": 0, "advanced": 0, "challenge": 0}
    type_counts = {}

    for ch in course_dict["chapters"]:
        chid = ch["id"]
        assert chid not in all_ids, f"Duplicate chapter ID: {chid}"
        all_ids.add(chid)
        
        for l in ch["lessons"]:
            lid = l["id"]
            assert lid not in all_ids, f"Duplicate lesson ID: {lid}"
            all_ids.add(lid)
            total_lessons += 1
            assert len(l["content"]) > 50, f"Lesson content too short: {lid}"
            
        for e in ch["exercises"]:
            eid = e["id"]
            assert eid not in all_ids, f"Duplicate exercise ID: {eid}"
            all_ids.add(eid)
            total_exercises += 1
            diff = e["difficulty"]
            if diff <= 2:
                tier_counts["basic"] += 1
            elif diff == 3:
                tier_counts["advanced"] += 1
            else:
                tier_counts["challenge"] += 1
                
            t = e["type"]
            type_counts[t] = type_counts.get(t, 0) + 1
            assert e.get("explanation"), f"Missing explanation: {eid}"

    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(course_dict, f, ensure_ascii=False, indent=2)

    print(f"[OK] Saved {cid} -> {filepath}")
    print(f"  {len(course_dict['chapters'])} Chapters | {total_lessons} Lessons | {total_exercises} Exercises")
    print(f"  Tiers: Basic={tier_counts['basic']} | Advanced={tier_counts['advanced']} | Challenge={tier_counts['challenge']}")
    print(f"  Types: {type_counts}")
