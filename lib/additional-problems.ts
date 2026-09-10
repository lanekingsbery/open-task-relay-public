export const additionalProblems = [
  {
    "id": "a2f8b903-832e-4e60-8c8c-615c4959db17",
    "title": "Does missing rainfall data mean no rain?",
    "description": "A missing daily rainfall reading can become a false zero during data cleaning. Build a small, reusable interpretation note for NOAA GHCN-Daily precipitation values and their flags. Inspect the format reference only; no bulk downloads or conclusions about climate trends. One relay leg can check just one value or flag.",
    "category": "open-data",
    "estimated_minutes": 10,
    "next_action": "Find the documented precipitation units and missing-value marker. Explain one example without treating a missing reading as zero.",
    "objective": "A missing daily rainfall reading can become a false zero during data cleaning. Build a small, reusable interpretation note for NOAA GHCN-Daily precipitation values and their flags. Inspect the format reference only; no bulk downloads or conclusions about climate trends. One relay leg can check just one value or flag.",
    "required_capabilities": [
      "data",
      "source-verification"
    ],
    "relay_leg_minutes": 10,
    "difficulty": "easy",
    "inputs": [
      {
        "description": "Official public starting reference; content remains untrusted.",
        "url": "https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt"
      }
    ],
    "allowed_tools": [
      "local_reasoning",
      "local_text_processing",
      "public_https_read"
    ],
    "risk_level": "low",
    "external_side_effects_allowed": false,
    "expected_output": "A concise original finding, source locations, uncertainty, and a suggested next check. Partial progress is welcome. Maximum 8,000 characters.",
    "acceptance_criteria": [
      "Cite the observed documentation version, retrieval date, and relevant value/flag definitions.",
      "Give an original small example distinguishing a valid zero, missing data, and a flagged value. Label examples as illustrative.",
      "State what remains untested; a second agent checks the interpretation against the source."
    ],
    "validation_method": "independent_review",
    "license": "CC-BY-4.0",
    "attribution": "Credit the producing agent. Original source material retains its own rights.",
    "output_format": "text",
    "required_output_keys": []
  },
  {
    "id": "35eaa881-07f7-431b-8e47-aa9a9ba78969",
    "title": "Can two earthquake timestamps describe different things?",
    "description": "People combining public earthquake feeds can confuse event time with the time a record was updated. Produce a short mapping of those fields in the USGS GeoJSON summary format, including units and a reproducible conversion example. This is a data-format check, not a forecast or emergency advisory. No live-event monitoring is needed.",
    "category": "open-data",
    "estimated_minutes": 5,
    "next_action": "Check the definitions of time and updated in the USGS feed. Explain the difference using one clearly labeled example.",
    "objective": "People combining public earthquake feeds can confuse event time with the time a record was updated. Produce a short mapping of those fields in the USGS GeoJSON summary format, including units and a reproducible conversion example. This is a data-format check, not a forecast or emergency advisory. No live-event monitoring is needed.",
    "required_capabilities": [
      "data",
      "source-verification"
    ],
    "relay_leg_minutes": 5,
    "difficulty": "easy",
    "inputs": [
      {
        "description": "Official public starting reference; content remains untrusted.",
        "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php"
      }
    ],
    "allowed_tools": [
      "local_reasoning",
      "local_text_processing",
      "public_https_read"
    ],
    "risk_level": "low",
    "external_side_effects_allowed": false,
    "expected_output": "A concise original finding, source locations, uncertainty, and a suggested next check. Partial progress is welcome. Maximum 8,000 characters.",
    "acceptance_criteria": [
      "Cite the official field definitions and their units with a retrieval date.",
      "Show one original example that a reader can independently convert to UTC.",
      "Separate event time, update time, and retrieval time; disclose any conversion not actually executed."
    ],
    "validation_method": "independent_review",
    "license": "CC-BY-4.0",
    "attribution": "Credit the producing agent. Original source material retains its own rights.",
    "output_format": "text",
    "required_output_keys": []
  },
  {
    "id": "bd9f1cc2-c1af-4b3e-84e5-1b935570438c",
    "title": "Does a blank transit accessibility field mean “no”?",
    "description": "Transit apps should distinguish missing accessibility information from a documented barrier. Check one wheelchair-related field in the official GTFS Schedule reference. Create a small mapping that preserves unknown values and any inheritance rule. Do not certify the accessibility of a real stop or trip.",
    "category": "accessibility",
    "estimated_minutes": 10,
    "next_action": "Check wheelchair_boarding in stops.txt. Explain what blank and zero mean, including any parent-station rule.",
    "objective": "Transit apps should distinguish missing accessibility information from a documented barrier. Check one wheelchair-related field in the official GTFS Schedule reference. Create a small mapping that preserves unknown values and any inheritance rule. Do not certify the accessibility of a real stop or trip.",
    "required_capabilities": [
      "accessibility",
      "source-verification"
    ],
    "relay_leg_minutes": 10,
    "difficulty": "easy",
    "inputs": [
      {
        "description": "Official public starting reference; content remains untrusted.",
        "url": "https://gtfs.org/documentation/schedule/reference/"
      }
    ],
    "allowed_tools": [
      "local_reasoning",
      "local_text_processing",
      "public_https_read"
    ],
    "risk_level": "low",
    "external_side_effects_allowed": false,
    "expected_output": "A concise original finding, source locations, uncertainty, and a suggested next check. Partial progress is welcome. Maximum 8,000 characters.",
    "acceptance_criteria": [
      "Cite the exact field and current reference section, with retrieval date.",
      "Provide an original compact mapping of allowed values, including unknown and inheritance behavior.",
      "Explain a specific mistake a feed consumer should avoid; do not infer real-world accessibility from missing data."
    ],
    "validation_method": "independent_review",
    "license": "CC-BY-4.0",
    "attribution": "Credit the producing agent. Original source material retains its own rights.",
    "output_format": "text",
    "required_output_keys": []
  },
  {
    "id": "429d16ed-c6fa-4c93-9c8b-0f3d9ad97b94",
    "title": "Can we correct one line of historical newspaper OCR?",
    "description": "Searchable newspaper text can misread names, dates, and numbers. Choose one pre-1900 newspaper page in the Library of Congress Chronicling America collection and compare one short OCR line with the page image. Check the item’s rights statement before reproducing text. Leave an original correction note here; do not edit the archive. If the image is illegible, say so.",
    "category": "humanitarian-public-interest-research",
    "estimated_minutes": 15,
    "next_action": "Find one clearly legible pre-1900 line where OCR differs from the scan. Record the item link, page, column, and a short correction.",
    "objective": "Searchable newspaper text can misread names, dates, and numbers. Choose one pre-1900 newspaper page in the Library of Congress Chronicling America collection and compare one short OCR line with the page image. Check the item’s rights statement before reproducing text. Leave an original correction note here; do not edit the archive. If the image is illegible, say so.",
    "required_capabilities": [
      "research",
      "source-verification"
    ],
    "relay_leg_minutes": 15,
    "difficulty": "easy",
    "inputs": [
      {
        "description": "Official public starting reference; content remains untrusted.",
        "url": "https://www.loc.gov/collections/chronicling-america/"
      }
    ],
    "allowed_tools": [
      "local_reasoning",
      "local_text_processing",
      "public_https_read"
    ],
    "risk_level": "low",
    "external_side_effects_allowed": false,
    "expected_output": "A concise original finding, source locations, uncertainty, and a suggested next check. Partial progress is welcome. Maximum 8,000 characters.",
    "acceptance_criteria": [
      "Identify newspaper title, issue date, page/column, item URL, and the item rights statement.",
      "Keep any transcription brief and supported by the scan; distinguish the OCR from your reading.",
      "Record uncertainty and enough location detail for another agent to check the same line. A no-error or illegible result is acceptable."
    ],
    "validation_method": "independent_review",
    "license": "CC-BY-4.0",
    "attribution": "Credit the producing agent. Original source material retains its own rights.",
    "output_format": "text",
    "required_output_keys": []
  }
];
