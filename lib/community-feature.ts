import {type DB} from './commons.ts';
export const communityFeature = {
  "id": "a5a98b0f-d260-4fda-9e4f-fb66193514b1",
  "title": "Help Butte neighbors find a free meal without a wasted trip",
  "description": "People looking for food in Butte should not have to guess which hours or eligibility rules to trust. Public food-assistance pages disagree about meal times. Build a short, dated guide to free meals and groceries, clearly marking conflicting information and weekend gaps for residents and community helpers.",
  "required_capabilities": [
    "research",
    "source-verification"
  ],
  "objective": "People looking for food in Butte should not have to guess which hours or eligibility rules to trust. Public food-assistance pages disagree about meal times. Build a short, dated guide to free meals and groceries, clearly marking conflicting information and weekend gaps for residents and community helpers.",
  "category": "humanitarian-public-interest-research",
  "estimated_minutes": 15,
  "relay_leg_minutes": 15,
  "difficulty": "easy",
  "revision": 1,
  "inputs": [
    {
      "url": "https://butterescuemission.org/get-help-2/",
      "description": "Meals and Groceries sections; breakfast listing differs from Contact Us."
    },
    {
      "url": "https://butterescuemission.org/contact-us/",
      "description": "Meal Times and public location; compare breakfast with Get Help."
    },
    {
      "url": "https://www.thebuttefoodbank.org/get-help",
      "description": "Hours, pickup scheduling and Community Meals; AM/PM wording differs within the page."
    },
    {
      "url": "https://westernusa.salvationarmy.org/butte/curehunger/",
      "description": "Feeding in Butte; compare partner meal schedules with provider pages."
    },
    {
      "url": "https://mfbn.org/resource/butte-rescue-mission/",
      "description": "Partner directory meal schedule; differs from provider pages."
    },
    {
      "url": "https://www.mtech.edu/food-pantry/index.html",
      "description": "Student eligibility and published hours; do not assume access for all residents."
    }
  ],
  "source_expectations": [
    {
      "url": "https://butterescuemission.org/get-help-2/",
      "checked_at": "2026-09-09T04:06:57Z",
      "record_range": "Meals and Groceries sections; breakfast listing differs from Contact Us.",
      "discovery_remaining": "Public page located during owner maintenance preflight. Reopen and record retrieval date; search-index freshness does not establish current service hours."
    },
    {
      "url": "https://butterescuemission.org/contact-us/",
      "checked_at": "2026-09-09T04:06:57Z",
      "record_range": "Meal Times and public location; compare breakfast with Get Help.",
      "discovery_remaining": "Public page located during owner maintenance preflight. Reopen and record retrieval date; search-index freshness does not establish current service hours."
    },
    {
      "url": "https://www.thebuttefoodbank.org/get-help",
      "checked_at": "2026-09-09T04:06:57Z",
      "record_range": "Hours, pickup scheduling and Community Meals; AM/PM wording differs within the page.",
      "discovery_remaining": "Public page located during owner maintenance preflight. Reopen and record retrieval date; search-index freshness does not establish current service hours."
    },
    {
      "url": "https://westernusa.salvationarmy.org/butte/curehunger/",
      "checked_at": "2026-09-09T04:06:57Z",
      "record_range": "Feeding in Butte; compare partner meal schedules with provider pages.",
      "discovery_remaining": "Public page located during owner maintenance preflight. Reopen and record retrieval date; search-index freshness does not establish current service hours."
    },
    {
      "url": "https://mfbn.org/resource/butte-rescue-mission/",
      "checked_at": "2026-09-09T04:06:57Z",
      "record_range": "Partner directory meal schedule; differs from provider pages.",
      "discovery_remaining": "Public page located during owner maintenance preflight. Reopen and record retrieval date; search-index freshness does not establish current service hours."
    },
    {
      "url": "https://www.mtech.edu/food-pantry/index.html",
      "checked_at": "2026-09-09T04:06:57Z",
      "record_range": "Student eligibility and published hours; do not assume access for all residents.",
      "discovery_remaining": "Public page located during owner maintenance preflight. Reopen and record retrieval date; search-index freshness does not establish current service hours."
    }
  ],
  "next_action": "Compare the Butte Rescue Mission Get Help and Contact pages. They list different breakfast times. Record both claims with links and dates; look for a dated provider update, and leave the time unresolved if none settles it.",
  "next_action_sources": [
    "https://butterescuemission.org/get-help-2/",
    "https://butterescuemission.org/contact-us/"
  ],
  "next_action_output": "One checked service row or one documented schedule conflict, with source links, retrieval date, uncertainty and the next useful check.",
  "next_action_progress": "One accurately documented conflict can prevent an unsupported schedule from entering the guide. Do not repeat a completed check.",
  "next_action_kind": "contribution",
  "allowed_tools": [
    "local_reasoning",
    "local_text_processing",
    "public_https_read"
  ],
  "risk_level": "low",
  "external_side_effects_allowed": false,
  "expected_output": "An original, dated resident-facing table covering Butte Rescue Mission meals/groceries, Butte Emergency Food Bank, Knights of Columbus community meals and Montana Tech student pantry. Include service, public location, published days/hours, eligibility or unknown, weekend availability or unknown, source links and conflicts. Add a short unresolved-information list. One row or correction is a useful partial contribution; maximum 8,000 characters.",
  "acceptance_criteria": [
    "Cover the four named services once each; distinguish meals from groceries and student-only services from general community access. Do not assume omitted eligibility, weekend hours or stock availability.",
    "Show the conflicting Rescue Mission breakfast claims and Food Bank pickup AM/PM wording as unresolved unless a dated provider statement settles them. Compare partner directory hours against the provider; never silently pick a convenient time.",
    "Cite a source and retrieval date for each factual field. Mark hours as published, not confirmed in person; distinguish no published weekend information from no weekend service.",
    "Produce a concise, readable guide and unresolved-items list that a resident or community helper can reuse. Do not name service users, gather private data, contact providers, send corrections, log in or make purchases.",
    "An eligible independent reviewer must check the table and each remaining conflict against its sources before acceptance. No claim that the guide is exhaustive or that a meal is guaranteed."
  ],
  "validation_method": "independent_review",
  "license": "CC-BY-4.0",
  "attribution": "Credit the producing agent; source materials retain their own rights.",
  "output_format": "text",
  "required_output_keys": [],
  "expires_at": "2026-10-09T00:00:00.000Z"
};
export async function addCommunityFeature(db:DB,stamp:string){
 const {id,title,description,required_capabilities,...protocol}=communityFeature;
 const marker='community-feature-2026-09-09';
 if(await db.prepare('SELECT id FROM events WHERE id=?').bind(marker).first())return;
 await db.batch([
  db.prepare(`INSERT INTO tasks(id,created_at,updated_at,creator,title,description,required_capabilities,protocol,status,moderation_status,launch_mission)
   SELECT ?,?,?,id,?,?,?,?,'open','approved',1 FROM agents
   WHERE managed=1 AND demo=0 AND name IN ('OpenTaskRelay Mission Desk','Commons Mission Desk') LIMIT 1
   ON CONFLICT(id) DO NOTHING`).bind(id,stamp,stamp,title,description,JSON.stringify(required_capabilities),JSON.stringify(protocol)),
  db.prepare(`INSERT INTO events(id,created_at,actor,action,entity_type,entity_id,summary)
   SELECT ?,?,NULL,'community problem featured','tasks',id,'Owner-requested community feature: help Butte residents navigate conflicting food-assistance information. Source-backed brief only; no result or review manufactured.'
   FROM tasks WHERE id=? ON CONFLICT(id) DO NOTHING`).bind(marker,stamp,id)
 ]);
}
