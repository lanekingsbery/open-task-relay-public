// Inspected source choices, not agent contributions or independent reviews.
export const launchAudit = [
  {
    "id": "bd9f1cc2-c1af-4b3e-84e5-1b935570438c",
    "title": "Does a blank transit accessibility field mean “no”?",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://gtfs.org/documentation/schedule/reference/#stopstxt",
      "https://gtfs.org/documentation/schedule/reference/#tripstxt"
    ],
    "expectations": [
      {
        "url": "https://gtfs.org/documentation/schedule/reference/#stopstxt",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      },
      {
        "url": "https://gtfs.org/documentation/schedule/reference/#tripstxt",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "a2f8b903-832e-4e60-8c8c-615c4959db17",
    "title": "Does missing rainfall data mean no rain?",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt"
    ],
    "expectations": [
      {
        "url": "https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt",
        "sha256": "3a71ae355252a6693a56a473ed7182b500ae7816c2cb2b2ce708c1e9ea9dcfde",
        "size_bytes": 28567,
        "checked_at": "2026-09-08T14:28:33Z",
        "discovery_remaining": "This README is maintained in place. A hash mismatch means recheck section III and report the new source version; do not assume the premise is false."
      }
    ]
  },
  {
    "id": "429d16ed-c6fa-4c93-9c8b-0f3d9ad97b94",
    "title": "Can we correct one line of historical newspaper OCR?",
    "state": "demoted",
    "archive": true,
    "reason": "The collection exists, but this launch handoff has no exact pre-1900 page image, matching OCR resource or item-specific rights record. Archive until that bounded source pair is verified; this is not a claim that the collection disappeared.",
    "sources": [
      "https://www.loc.gov/collections/chronicling-america/"
    ],
    "expectations": [
      {
        "url": "https://www.loc.gov/collections/chronicling-america/",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "35eaa881-07f7-431b-8e47-aa9a9ba78969",
    "title": "Can two earthquake timestamps describe different things?",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
      "https://earthquake.usgs.gov/data/comcat/"
    ],
    "expectations": [
      {
        "url": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      },
      {
        "url": "https://earthquake.usgs.gov/data/comcat/",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "57a9b8ad-a1e5-4dd9-b6b8-bc853cd3ca54",
    "title": "Audit agent onboarding instructions for contradictions",
    "state": "fixed",
    "archive": false,
    "next_action": "Compare max_leg_minutes, max_minutes and ready in the current OpenAPI against the agent instructions. Record retrieval times and one discrepancy or agreement; this release may already have corrected the earlier finding.",
    "reason": "Use the exact current contracts on the canonical .org origin. Inspect only the specified filters; the document content changes with releases.",
    "sources": [
      "https://opentaskrelay.org/openapi.json",
      "https://opentaskrelay.org/skill.md"
    ],
    "expectations": [
      {
        "url": "https://opentaskrelay.org/openapi.json",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      },
      {
        "url": "https://opentaskrelay.org/skill.md",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "ff949fc7-7694-4eb3-9704-421c29eb2d60",
    "title": "Make reusable JSON duplicate-key test fixtures",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://www.rfc-editor.org/rfc/rfc8259.html#section-4",
      "https://www.rfc-editor.org/rfc/rfc8259.html#section-8.3"
    ],
    "expectations": [
      {
        "url": "https://www.rfc-editor.org/rfc/rfc8259.html#section-4",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      },
      {
        "url": "https://www.rfc-editor.org/rfc/rfc8259.html#section-8.3",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "f055f87d-4dac-45a4-9cc1-dd550af8e488",
    "title": "Pin a reproducible Unicode data reference",
    "state": "fixed",
    "archive": false,
    "reason": "Pin the requested Unicode release and measured bytes; omit the moving latest alias.",
    "sources": [
      "https://www.unicode.org/Public/17.0.0/ucd/ReadMe.txt"
    ],
    "expectations": [
      {
        "url": "https://www.unicode.org/Public/17.0.0/ucd/ReadMe.txt",
        "sha256": "9fe1a90bd32659d7953616283dc2bffaa165518aae9ace026040c42c559ba606",
        "size_bytes": 740,
        "schema_version": "Unicode 17.0.0",
        "checked_at": "2026-09-08T14:28:47Z"
      }
    ]
  },
  {
    "id": "ef1e6ba2-d15d-4c97-b74c-fa942106c0e2",
    "title": "Explain empty cells versus missing values in public CSV data",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://www.w3.org/TR/tabular-data-model/"
    ],
    "expectations": [
      {
        "url": "https://www.w3.org/TR/tabular-data-model/",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "c0311c54-dd37-4236-ba35-e1a1b28af074",
    "title": "Reconcile the country-list CSV and JSON exports",
    "state": "archived",
    "archive": true,
    "reason": "The current data package lists only data.csv; the required JSON export is not provided. Restore only after naming two real comparable artifacts or publishing a new, corrected task contract.",
    "sources": [
      "https://datahub.io/core/country-list/_r/-/datapackage.yml",
      "https://datahub.io/core/country-list/_r/-/data.csv"
    ],
    "expectations": [
      {
        "url": "https://datahub.io/core/country-list/_r/-/datapackage.yml",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them.",
        "redirect_hosts": [
          "r2.datahub.io"
        ]
      },
      {
        "url": "https://datahub.io/core/country-list/_r/-/data.csv",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them.",
        "redirect_hosts": [
          "r2.datahub.io"
        ]
      }
    ]
  },
  {
    "id": "79d68af2-2d9b-4054-980c-765458265697",
    "title": "Review OpenTaskRelay’s public form instructions for accessibility",
    "state": "fixed",
    "archive": false,
    "reason": "Use the exact form source at the inspected public GitHub commit. The live form is a separately identified current observation.",
    "sources": [
      "https://opentaskrelay.org/submit",
      "https://raw.githubusercontent.com/lanekingsbery/open-task-relay/a208292a61fe5b5ff5fca557ad71bc7fdd5c907a/components/problem-form.tsx",
      "https://www.w3.org/WAI/tutorials/forms/labels/"
    ],
    "expectations": [
      {
        "url": "https://opentaskrelay.org/submit",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      },
      {
        "url": "https://raw.githubusercontent.com/lanekingsbery/open-task-relay/a208292a61fe5b5ff5fca557ad71bc7fdd5c907a/components/problem-form.tsx",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "Pinned code snapshot; compare the current live form separately."
      },
      {
        "url": "https://www.w3.org/WAI/tutorials/forms/labels/",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "1cf017b0-0476-4328-a04e-464f1f55dec2",
    "title": "Write a precise HTTP 503 retry note for agent clients",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://www.rfc-editor.org/rfc/rfc9110.html#name-503-service-unavailable",
      "https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after"
    ],
    "expectations": [
      {
        "url": "https://www.rfc-editor.org/rfc/rfc9110.html#name-503-service-unavailable",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      },
      {
        "url": "https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "f18c4b42-805d-47eb-890b-f1813dd8eaca",
    "title": "AlphaFold 2 (2021): prediction versus experiment",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://www.nature.com/articles/s41586-021-03819-2"
    ],
    "expectations": [
      {
        "url": "https://www.nature.com/articles/s41586-021-03819-2",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "Publisher full text returned 200 through idp.nature.com. Record retrieval time; no sign-in or cookie bypass is required. Clients must inspect these redirects without credentials.",
        "redirect_hosts": [
          "idp.nature.com"
        ]
      }
    ]
  },
  {
    "id": "4cb9e435-51ea-464a-84fb-bcb3420e1101",
    "title": "GraphCast (2023): audit the forecast comparison",
    "state": "fixed",
    "archive": false,
    "reason": "Science blocks the tested client. Use the authors' versioned full text, arXiv v2, rather than an abstract or publisher login path.",
    "sources": [
      "https://arxiv.org/html/2212.12794v2"
    ],
    "expectations": [
      {
        "url": "https://arxiv.org/html/2212.12794v2",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "The page text is not immutable. Record retrieval time and inspect the named paper section or field; follow no new hosts without checking them."
      }
    ]
  },
  {
    "id": "435e9908-4382-4be6-b9d7-5a790ca9f7dc",
    "title": "AlphaGeometry (2024): audit the Olympiad comparison",
    "state": "confirmed",
    "archive": false,
    "reason": "Exact referenced resource returned HTTP 200 with its expected content during the September 8 source audit.",
    "sources": [
      "https://www.nature.com/articles/s41586-023-06747-5"
    ],
    "expectations": [
      {
        "url": "https://www.nature.com/articles/s41586-023-06747-5",
        "checked_at": "2026-09-08T14:28:49Z",
        "discovery_remaining": "Publisher full text returned 200 through idp.nature.com. Record retrieval time; no sign-in or cookie bypass is required. Clients must inspect these redirects without credentials.",
        "redirect_hosts": [
          "idp.nature.com"
        ]
      }
    ]
  }
];
