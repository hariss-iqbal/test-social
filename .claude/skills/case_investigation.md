# Case Investigation Methodology

## Purpose
Systematic framework for researching true crime, mystery, and documentary-worthy cases. Produces structured JSON output for downstream script writing.

## Investigation Framework

### Core Questions
For every case, answer:
- **WHO**: All people involved — victims, suspects, witnesses, investigators, family
- **WHAT**: What happened, what was found, what evidence exists
- **WHEN**: Full chronological timeline with specific dates
- **WHERE**: All relevant locations with descriptions
- **WHY**: Motives, theories, official conclusions, alternative theories

### Person Tracking
For each person mentioned:
- Full name (and aliases/nicknames)
- Age at time of events
- Role in the case (victim, suspect, witness, investigator, family member)
- Key actions or statements
- Photo search terms (e.g., "Elisa Lam student photo", "Cecil Hotel manager")
- Current status if known (alive, deceased, imprisoned, whereabouts unknown)

### Suspect/Person of Interest Tracking
- Arrests: dates, charges, jurisdiction
- Trial: verdict, sentencing, appeals
- Mugshot/court appearance search terms
- Alibis or evidence for/against

### Timeline Construction
Build a chronological timeline with:
- Specific dates (not "sometime in January" — find the exact date)
- What happened at each point
- Source for each timeline entry
- Flag any conflicting timelines across sources

### Case Status Determination
Classify as one of:
- **SOLVED**: Official conviction or confirmed resolution
- **UNSOLVED**: No resolution, case remains open
- **ONGOING**: Active investigation or legal proceedings
- **CONTROVERSIAL**: Officially resolved but widely disputed

Criteria:
- SOLVED requires: conviction OR official ruling with evidence
- UNSOLVED requires: no arrest OR acquittal with no re-investigation
- ONGOING requires: active warrants, pending trials, or recent investigative activity
- CONTROVERSIAL requires: official position contradicted by significant evidence or expert opinion

### Closing Facts
Every case needs:
- Last verified update (with date and source)
- Current whereabouts of key people (if alive)
- Recent developments (last 2 years)
- Unanswered questions that remain

### Source Quality
- **Tier 1**: Court records, police reports, official statements, coroner reports
- **Tier 2**: Major news outlets (AP, Reuters, NYT, BBC, local papers of record)
- **Tier 3**: Documentary films, long-form journalism, investigative podcasts
- **Flag**: Tabloid-only claims must be marked as unverified
- Cross-reference: Any key fact needs 2+ independent sources to be marked `verified: true`

### Compelling Details
Identify details that make good storytelling hooks:
- Eerie coincidences
- Unexplained evidence
- Contradictions in official accounts
- Dramatic moments (last phone calls, final sightings)
- Bizarre circumstances
- Cultural impact or public reaction

## Output Schema

Write output as `research.json` with this structure:

```json
{
  "topic": "Case name",
  "summary": "2-3 sentence overview",
  "category": "true_crime | mystery | conspiracy | historical | disappearance",
  "timeline": [
    {
      "date": "YYYY-MM-DD",
      "event": "What happened",
      "source": "URL or source name",
      "significance": "Why this matters to the story"
    }
  ],
  "key_people": [
    {
      "name": "Full Name",
      "role": "victim | suspect | witness | investigator | family | expert",
      "age_at_time": 21,
      "description": "Who they are and their role in events",
      "photo_search_suggestions": ["search query 1", "search query 2"],
      "current_status": "Description of current status"
    }
  ],
  "key_facts": [
    {
      "fact": "The specific fact",
      "source": "URL",
      "verified": true,
      "category": "evidence | testimony | forensic | circumstantial"
    }
  ],
  "case_status": "SOLVED | UNSOLVED | ONGOING | CONTROVERSIAL",
  "closing_facts": {
    "last_update": "Most recent verified development with date",
    "current_whereabouts": "Where key people are now",
    "recent_developments": "Anything new in last 2 years",
    "unanswered_questions": ["Question 1", "Question 2"]
  },
  "compelling_details": [
    {
      "detail": "The specific detail",
      "why_compelling": "Why this makes good storytelling",
      "use_as": "hook | twist | cliffhanger | emotional_beat"
    }
  ],
  "iconic_visuals": [
    {
      "description": "What the visual shows — the image/footage the audience expects to see",
      "why_iconic": "Why this is a must-have (e.g., 'most recognized image of the case')",
      "search_terms": ["specific search query 1", "specific search query 2"]
    }
  ],
  "locations": [
    {
      "name": "Location name",
      "description": "What happened here",
      "search_terms": ["search query for photos"]
    }
  ],
  "sources": ["URL1", "URL2"]
}
```
