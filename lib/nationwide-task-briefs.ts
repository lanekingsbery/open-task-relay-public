import type {RegionalBrief} from './regional-task-briefs.ts';

// Owner-requested public work. Fixed IDs; never repurpose a released brief.
// Editorial source discovery: 2026-09-10 UTC. Findings remain for contributors.
export const nationwideBriefs:RegionalBrief[]=[
  {
    "id": "b8eba392-02d2-4007-a58e-31ce1d3b4c6f",
    "category": "environment",
    "state": "AK",
    "locality": "Kenai Peninsula",
    "region": "Alaska",
    "title": "Read Kenai culvert fish-passage ratings without treating them as current inspections",
    "benefit": "Watershed volunteers and road planners can use dated passage assessments without mistaking a rating for proof that fish can pass today.",
    "scope": "Start with ADF&G site 20303796 on the Kenai Spur Highway, then select two other Kenai Peninsula crossings by site ID. Pair each survey date, passage rating and missing measurement with the assessment manual; distinguish measured, estimated and unobserved fields.",
    "first": "Check the date and rating definition for site 20303796; leave the next crossing ID for another leg.",
    "output": "Three crossing summaries with rating definitions, survey age and the evidence needed for a later reassessment.",
    "distinctFocus": "Culvert assessment evidence versus present passage",
    "sources": [
      [
        "https://www.adfg.alaska.gov/index.cfm?adfg=fishpassage.database",
        "Official inventory and public crossing records"
      ],
      [
        "https://www.adfg.alaska.gov/fedaidpdfs/SP14-08.pdf",
        "Rating methods and survey field definitions"
      ]
    ],
    "criteria": [
      "Do not infer fish presence from a passage rating or propose field entry or culvert work.",
      "Keep the survey date separate from the page retrieval date."
    ],
    "minutes": 5
  },
  {
    "id": "b5f5b270-74d7-4aa4-a03f-e61bd9e931a7",
    "category": "environment",
    "state": "KS",
    "locality": "Reno County and Hutchinson",
    "region": "Plains",
    "title": "Trace Kansas abandoned-well work from inventory to reported plugging",
    "benefit": "Residents and conservation groups can distinguish an inventoried well from a funded job or a documented completed plugging.",
    "scope": "Use the two latest KCC abandoned-well legislative reports. Follow three Reno County entries if individual entries are public; otherwise use the county totals and record that limit. Track inventory, prioritization, funding and completed work without treating any one status as measured pollution.",
    "first": "Pin both report years and follow one Reno County entry or aggregate through its status labels; identify the next unmatched entry.",
    "output": "A dated status crosswalk for three entries, or a two-report county reconciliation when individual records are unavailable.",
    "distinctFocus": "Restoration status trail and aggregate fallback",
    "sources": [
      [
        "https://www.kcc.ks.gov/oil-gas/abandoned-wells",
        "KCC program, FAQs and linked legislative reports"
      ]
    ],
    "criteria": [
      "Separate cumulative totals from annual work; absence from a later list does not prove plugging.",
      "Do not publish private landowner details, visit wells or infer contamination."
    ],
    "minutes": 5
  },
  {
    "id": "58548f9b-0d00-4061-8d0c-ccee58da3f1d",
    "category": "environment",
    "state": "ME",
    "locality": "Harpswell and Casco Bay",
    "region": "Northeast",
    "title": "Check which Casco Bay eelgrass survey areas can support a change comparison",
    "benefit": "Coastal volunteers can avoid describing an unmapped area or a different survey footprint as lost habitat.",
    "scope": "Compare the Maine DEP eelgrass layers for 2013 and 2018 around Harpswell. Inspect survey coverage, cover classes and minimum mapping units before selecting two overlapping public shoreline areas. Record whether an area comparison is supported; do not require a loss finding.",
    "first": "Check the coverage and mapping-unit note for one layer, then name the matching area or unresolved footprint needed next.",
    "output": "A two-area comparability note with layer IDs, survey dates, class meanings and supported or unsupported change calculations.",
    "distinctFocus": "Habitat survey footprint and detectability",
    "sources": [
      [
        "https://gis.maine.gov/mapservices/rest/services/dep/Eelgrass/MapServer",
        "DEP layers, coverage descriptions and cover classes"
      ]
    ],
    "criteria": [
      "No mapped polygon is not proof of no eelgrass.",
      "Do not calculate change outside common survey coverage or infer causes of habitat change."
    ],
    "minutes": 5
  },
  {
    "id": "b0aeb8f2-6a4e-42df-b361-05ab83ea4189",
    "category": "environment",
    "state": "DE",
    "locality": "Dover and Kent County",
    "region": "Mid-Atlantic",
    "title": "Distinguish Delaware wetland inventory maps from regulatory boundary records",
    "benefit": "Residents planning ordinary property projects can identify what each wetland map answers before relying on it.",
    "scope": "Compare the biological wetland inventory, state map index and current DNREC guidance using one public park area near Dover. Build a map-purpose crosswalk and trace any new non-tidal program language to its dated official guidance; leave parcel-level jurisdiction undecided.",
    "first": "Document one map legend and its stated purpose; leave the corresponding regulatory source as the next check.",
    "output": "A three-source map guide explaining coverage, dates, boundary limits and where a formal determination remains necessary.",
    "distinctFocus": "Biological inventory versus jurisdictional determination",
    "sources": [
      [
        "https://dnrec.delaware.gov/watershed-stewardship/wetlands/realtors/",
        "Biological and regulatory map distinctions"
      ],
      [
        "https://dnrec.delaware.gov/water/wetlands/",
        "Current program and linked map guidance"
      ]
    ],
    "criteria": [
      "Do not apply an older tidal-only summary to newer non-tidal rules without checking dates.",
      "Use a public example area, not private parcel owners; do not decide permitting eligibility."
    ],
    "minutes": 5
  },
  {
    "id": "243d2c3a-5a4c-4fe6-9852-d33d7dd966e0",
    "category": "public-safety",
    "state": "HI",
    "locality": "Hilo, Hawaii Island",
    "region": "Hawaii",
    "title": "Match Hilo tsunami map legends to the correct evacuation guidance",
    "benefit": "Residents, visitors and preparedness educators can understand which official map and zone definition they are viewing.",
    "scope": "Compare the Hilo sheet in Hawaii County's downloadable maps with HI-EMA guidance and state GIS metadata. Record map edition, named zone types, geographic coverage and the current official warning source. Explain what is static planning information and what must be checked during an event.",
    "first": "Pin the Hilo map edition and explain one legend label with an official citation; next check the same label in the state guidance.",
    "output": "A dated map-reading card with a zone-label crosswalk and links to current official instructions.",
    "distinctFocus": "Static evacuation geography versus event instructions",
    "sources": [
      [
        "https://dod.hawaii.gov/hiema/tsunami-evacuation-zones/",
        "State guidance and county maps"
      ],
      [
        "https://files.hawaii.gov/dbedt/op/gis/data/tsunevac.pdf",
        "State layer metadata and island-specific qualifications"
      ]
    ],
    "criteria": [
      "Do not invent routes, travel times, safe buildings or an all-clear.",
      "Do not assume an extreme-zone label applies to every island; this is a planning reference, not live guidance."
    ],
    "minutes": 5
  },
  {
    "id": "66e77d5b-67d8-4327-9e2e-0c37c5103703",
    "category": "public-safety",
    "state": "OK",
    "locality": "Norman",
    "region": "Plains",
    "title": "Date-check Norman storm-refuge references before they are reused",
    "benefit": "Preparedness volunteers can keep historical refuge lists and private shelter registries from becoming unsupported public-shelter promises.",
    "scope": "Compare the OU Police tornado handout with current Norman Emergency Management and shelter-registry pages. Classify up to three shelter or refuge statements by date, operator, public access and source confirmation. If current access cannot be confirmed, retain the historical statement only as historical.",
    "first": "Date one refuge statement in the OU handout and look for current official corroboration; leave the next statement to check.",
    "output": "Three evidence-linked statement checks and an original note explaining registry, campus refuge and public-shelter distinctions.",
    "distinctFocus": "Historical refuge information and access status",
    "sources": [
      [
        "https://www.ou.edu/content/dam/OUPD/documents/tornado.pdf",
        "Historical OU tornado handout; not proof of current access"
      ],
      [
        "https://www.normanok.gov/public-safety/fire-department/emergency-management",
        "Current city preparedness starting point"
      ],
      [
        "https://www.normanok.gov/storm-shelter-registration",
        "Purpose of the city shelter registry"
      ]
    ],
    "criteria": [
      "An unconfirmed listing is not confirmed closure or availability.",
      "Do not publish private shelter locations or recommend travel during a warning."
    ],
    "minutes": 5
  },
  {
    "id": "c57e7a6a-d4b1-4865-b5d5-971bef282232",
    "category": "public-safety",
    "state": "WV",
    "locality": "Morgantown and Westover",
    "region": "Appalachia",
    "title": "Separate water-service restoration from a lifted Morgantown boil-water advisory",
    "benefit": "Households can read utility notices without assuming that running water means an advisory has ended.",
    "scope": "Use MUB's advisory guidance and its March 2026 Westover work notice as a historical example. Trace notice area, work completion, testing and any separately published lifting notice. Keep unknown stages blank and explain how residents find the current official notice.",
    "first": "Extract the affected area and date from one archived notice; next locate its explicit lifting notice or document that it was not found.",
    "output": "A source-linked notice timeline and four plain-language status definitions for community notice writers.",
    "distinctFocus": "Advisory lifecycle versus restored service",
    "sources": [
      [
        "https://mub.org/boilwater",
        "MUB advisory and testing explanations"
      ],
      [
        "https://mub.org/newsroom/westover-work",
        "Dated historical work notice"
      ]
    ],
    "criteria": [
      "Do not issue water-use instructions or imply the historical advisory is active now.",
      "Only an explicit utility notice supports a claim that an advisory was lifted."
    ],
    "minutes": 5
  },
  {
    "id": "0a5a3256-fb43-4034-be52-fb8f5ca7839a",
    "category": "public-safety",
    "state": "SD",
    "locality": "Pierre and central South Dakota",
    "region": "Plains",
    "title": "Explain South Dakota road-status labels without inventing a safe detour",
    "benefit": "Travelers can distinguish no-travel advice, suspended maintenance and enforced closures on official winter road information.",
    "scope": "Trace three road-status labels from the latest SDDOT winter highway maintenance plan to SD511's legend. Use the Pierre region as the map example. Record status meaning, update-time display and whether overlapping notices have separate meanings.",
    "first": "Locate the current plan and reconcile one status label with the SD511 legend; leave the next label and timestamp field to check.",
    "output": "A three-label reference with current source links, update-time limits and one clearly labeled historical or hypothetical reading example.",
    "distinctFocus": "Closure and maintenance status semantics",
    "sources": [
      [
        "https://dot.sd.gov/media/249e23dc/2024-2025Winter%20HighwayMaintenancePlan.pdf",
        "Earlier plan as a starting point; locate its current successor"
      ],
      [
        "https://www.sd511.org/",
        "Official traveler map and legend"
      ]
    ],
    "criteria": [
      "Do not treat a missing restriction as safe travel or recommend a route.",
      "Identify the plan season and use current official instructions for actual travel."
    ],
    "minutes": 5
  },
  {
    "id": "58138bfc-609c-4eb4-9223-f1f390a4fabc",
    "category": "accessibility",
    "state": "PA",
    "locality": "Harrisburg",
    "region": "Mid-Atlantic",
    "title": "Reconcile accessible Pennsylvania Capitol entrances with visitor and tour hours",
    "benefit": "Visitors using mobility aids can distinguish building-entry information from tour booking and security procedures.",
    "scope": "Compare DGS visitor entrance guidance and Capitol tour instructions for a weekday and weekend visit. Match the named accessible entrance, published opening hours, security information and tour check-in location. Mark an unstated connecting route as a question, not a verified accessible path.",
    "first": "Check the named accessible entrance and its weekday hours in one source; next verify weekend entry against the tour page.",
    "output": "A two-scenario visit-preparation checklist with source links and unresolved entrance-to-check-in details.",
    "distinctFocus": "Accessible government entry and security timing",
    "sources": [
      [
        "https://www.pa.gov/agencies/dgs/visit-the-capitol-complex",
        "Official entrance hours and security information"
      ],
      [
        "https://www.pacapitol.com/book-a-tour/",
        "Tour booking, arrival and weekend conditions"
      ]
    ],
    "criteria": [
      "Do not certify an accessible itinerary from general building labels.",
      "Separate published security requirements from accommodations that require confirmation."
    ],
    "minutes": 5
  },
  {
    "id": "177e6a2a-2847-4dea-8326-76719bdbda01",
    "category": "accessibility",
    "state": "NJ",
    "locality": "Newark Liberty International Airport",
    "region": "Mid-Atlantic",
    "title": "Locate Newark service-animal relief areas on both sides of security",
    "benefit": "Travelers with service animals can prepare connection questions using terminal-specific information.",
    "scope": "Check terminals A, B and C against the airport accessibility page and official terminal maps. Record each published relief area's terminal, level, landmark and whether it is before or after security; retain contradictions or unstated security boundaries.",
    "first": "Match one Terminal A relief area to its official map and record its security side; next check a Terminal B listing.",
    "output": "A three-terminal reference of documented relief locations and questions about connections or re-screening.",
    "distinctFocus": "Service-animal facilities and secure-area boundaries",
    "sources": [
      [
        "https://www.newarkairport.com/at-airport/accessibility-services",
        "Airport accessibility and linked terminal resources"
      ],
      [
        "https://www.newarkairport.com/at-airport/family-amenities-and-services",
        "Amenity listings and map links"
      ]
    ],
    "criteria": [
      "Do not infer that a traveler can move between security areas without screening.",
      "Published facilities do not guarantee present availability; no live itinerary claims."
    ],
    "minutes": 5
  },
  {
    "id": "30b26f37-895f-4df1-b0d9-d9c1355118b8",
    "category": "accessibility",
    "state": "AR",
    "locality": "Little Rock and statewide iCAN users",
    "region": "South",
    "title": "Compare Arkansas assistive-device demonstrations, loans and reuse",
    "benefit": "Residents and disability-service navigators can distinguish trying equipment from borrowing it or receiving a reused device.",
    "scope": "Use iCAN's public program descriptions and inventory links to compare demonstration, loan and reuse for three device types represented in its listings. Record service coverage, published request steps, cost and return terms; a missing term remains an open question.",
    "first": "Check one device listing and classify the program it belongs to; next verify its published borrowing or transfer terms.",
    "output": "A three-device program comparison and a short list of questions a prospective user would need answered.",
    "distinctFocus": "Assistive technology trial versus ownership",
    "sources": [
      [
        "https://ar-ican.org/",
        "Official iCAN program and equipment starting points"
      ]
    ],
    "criteria": [
      "Do not infer stock, suitability, guaranteed approval or clinical benefit.",
      "Do not request a device or collect disability or medical information."
    ],
    "minutes": 5
  },
  {
    "id": "83d956e5-42db-49a8-96cc-415663cec322",
    "category": "accessibility",
    "state": "RI",
    "locality": "Newport-area visitors",
    "region": "Northeast",
    "title": "Clarify RIPTA paratransit visitor status before a Newport trip",
    "benefit": "Visitors with disabilities can separate visitor documentation from local certification and trip reservations.",
    "scope": "Compare RIPTA's current visitor policy, RIde application introduction and service-area guidance. Extract documentation routes for visitors with and without home-system certification, the published visitor-use window and the separate conditions for reserving a Newport-area trip.",
    "first": "Follow the RIde page to the visitor policy and verify one documentation route; next check its service-window and reservation limits.",
    "output": "A visitor-versus-resident process table with coverage limits and unresolved booking questions.",
    "distinctFocus": "Visitor paratransit recognition and booking conditions",
    "sources": [
      [
        "https://www.ripta.com/RIdeParatransit",
        "Current RIde page, visitor policy and application links"
      ]
    ],
    "criteria": [
      "Visitor eligibility is not a guaranteed ride or coverage for every destination.",
      "No applications, personal travel details or individual eligibility decisions."
    ],
    "minutes": 5
  },
  {
    "id": "c9734f07-fbde-4a27-8cb3-2665ce7b6313",
    "category": "science",
    "state": "WY",
    "locality": "Yellowstone region within Wyoming",
    "region": "Mountain West",
    "title": "Preserve magnitude types and revisions in a Wyoming earthquake sample",
    "benefit": "Students and local science communicators can compare catalog entries without treating every magnitude or preliminary value as interchangeable.",
    "scope": "Query USGS ComCat for January 2025 in the Wyoming part of the Yellowstone region, using a documented bounding box and checking state location. Select the first three events by UTC time. Record event ID, magnitude type, review status and update timestamp; inspect alternate solutions only when publicly linked.",
    "first": "Save the reproducible query and one event's magnitude type and review status; leave the next event ID to check.",
    "output": "A three-event citation table explaining revision and magnitude-type limits without a seismic trend claim.",
    "distinctFocus": "Seismic solution provenance and revision",
    "sources": [
      [
        "https://earthquake.usgs.gov/earthquakes/search/",
        "Catalog filters and public event pages"
      ],
      [
        "https://earthquake.usgs.gov/data/comcat/",
        "Catalog fields and magnitude definitions"
      ]
    ],
    "criteria": [
      "Exclude events outside Wyoming and distinguish event time from update time.",
      "No earthquake prediction, building assessment or inference that a small sample represents regional hazard."
    ],
    "minutes": 5
  },
  {
    "id": "9b973e3b-6416-4f36-ae1a-03c6b633d34f",
    "category": "science",
    "state": "ND",
    "locality": "Stutsman County and nearby survey routes",
    "region": "Plains",
    "title": "Check survey effort before comparing North Dakota breeding-bird counts",
    "benefit": "Bird-monitoring volunteers can tell an unrun route from a completed survey with no recorded detections.",
    "scope": "Use the 2026 BBS release to select one Stutsman County route, or the closest documented North Dakota route if needed. Compare its 2023-2025 run metadata: run presence, timing, weather and quality flag. Check counts for one common species only when comparable runs exist.",
    "first": "Pin the release and one route-year's run metadata; next check whether the adjacent year was actually surveyed.",
    "output": "A three-year effort table and one qualified species comparison, with missing runs kept distinct from zero counts.",
    "distinctFocus": "Bird survey effort and non-detection",
    "sources": [
      [
        "https://www.usgs.gov/data/2026-release-north-american-breeding-bird-survey-dataset-1966-2025",
        "Dataset, methods and run-level metadata"
      ]
    ],
    "criteria": [
      "No population trend or causal inference from one route.",
      "Keep observer identities and sensitive species locations out of the contribution."
    ],
    "minutes": 5
  },
  {
    "id": "f1622c4f-59cf-466d-8ac2-46044962e77d",
    "category": "science",
    "state": "AZ",
    "locality": "Tucson-area tree-ring study",
    "region": "Southwest",
    "title": "Separate tree-ring measurements from the Tucson Side chronology",
    "benefit": "Students reusing public paleoclimate data can distinguish raw ring width, standardized chronology and sample depth.",
    "scope": "Use NOAA ITRDB study noaa-tree-3415, labeled Tucson Side. Match the chronology and any linked measurement files by study and site code. Inspect five common years for units, chronology values and sample-depth information; document any missing file or undefined column.",
    "first": "Read one file header and identify whether it contains measurements or chronology values; next find the matching year in the other file.",
    "output": "A five-year field crosswalk with study citation, unit meanings and limits on climate interpretation.",
    "distinctFocus": "Dendrochronology standardization and replication",
    "sources": [
      [
        "https://www.ncei.noaa.gov/metadata/geoportal/rest/metadata/item/noaa-tree-3415/html",
        "Tucson Side study and data files"
      ],
      [
        "https://www.ncei.noaa.gov/products/paleoclimatology/tree-ring",
        "ITRDB format and reuse guidance"
      ]
    ],
    "criteria": [
      "Do not label a chronology index as millimeters or direct temperature.",
      "Sample depth is not automatically the number of independent trees; retain the source definition."
    ],
    "minutes": 5
  },
  {
    "id": "c142b6f1-624d-4339-af65-4db81505ac41",
    "category": "science",
    "state": "NM",
    "locality": "Socorro and the Very Large Array",
    "region": "Southwest",
    "title": "Make a small VLA archive sample reproducible without downloading observations",
    "benefit": "Astronomy students can identify suitable public observations and cite their frequency coverage before attempting large downloads.",
    "scope": "Use the NRAO public archive to select three non-proprietary VLA observations of the same named calibration target, ordered by observation date. Record project and observation IDs, time range, frequency bounds with units and public-release status. Inspect metadata only.",
    "first": "Pin a public archive query and one observation's frequency unit and release status; leave its ID and the next comparison record.",
    "output": "Three metadata-only observation cards and a short explanation of what would still be needed for scientific analysis.",
    "distinctFocus": "Radio astronomy archive selection and frequency units",
    "sources": [
      [
        "https://science.nrao.edu/facilities/vla/archive/index",
        "Archive interface, access terms and metadata guidance"
      ],
      [
        "https://science.nrao.edu/facilities/vla/archive/scripted-access-to-the-nrao-archive",
        "Public metadata field definitions"
      ]
    ],
    "criteria": [
      "Do not sign in, retrieve proprietary data or download visibility datasets.",
      "Frequency coverage alone does not establish sensitivity, resolution or suitability for a scientific conclusion."
    ],
    "minutes": 5
  },
  {
    "id": "4a4a4563-bd81-479a-b9d6-30c6d25dfd02",
    "category": "education",
    "state": "AL",
    "locality": "Huntsville and Madison County",
    "region": "South",
    "title": "Check which Alabama homework-help features are live, asynchronous or self-guided",
    "benefit": "Students and working parents can choose the right published learning option without confusing tutor hours with always-available materials.",
    "scope": "Follow HMCPL's Homework Alabama link to the current provider. Compare live tutoring, submitted-work review and self-guided practice for access requirements, published hours and subject or age limits. Check older library descriptions against the current service page.",
    "first": "Verify one live-tutoring access or schedule statement and its date; next check the separate work-review feature.",
    "output": "A three-feature learning-access guide with source dates and any unconfirmed availability limits.",
    "distinctFocus": "Tutoring delivery modes and access conditions",
    "sources": [
      [
        "https://blog.hmcpl.org/back-school-hmcpls-all-ages-resource-guide",
        "Local library referral; older description needs rechecking"
      ],
      [
        "https://careeralabama.org/",
        "Current Homework Alabama feature descriptions"
      ]
    ],
    "criteria": [
      "Do not create accounts or upload schoolwork.",
      "Do not promise response times or apply older temporary service expansions to current users."
    ],
    "minutes": 5
  },
  {
    "id": "455e12e2-5e2c-46ec-b9c5-31e482117974",
    "category": "education",
    "state": "IN",
    "locality": "Bloomington-area Ivy Tech students",
    "region": "Midwest",
    "title": "Distinguish Indiana College Core transfer from junior-standing pathways",
    "benefit": "Community-college students can see which published transfer promises concern general education and which concern a completed degree pathway.",
    "scope": "Compare Ivy Tech's College Core explanation with one current TSAP agreement for a public four-year destination accessible to Bloomington students. Trace the credential, required completion conditions and receiving-program caveats across both institutions' public pages.",
    "first": "Pin one agreement's date and credential requirement; next verify the receiving institution's matching condition.",
    "output": "A two-pathway comparison with three agreement-specific conditions and questions for an academic adviser.",
    "distinctFocus": "Block credit transfer versus degree articulation",
    "sources": [
      [
        "https://www.ivytech.edu/admissions/transfer-pathways/",
        "College Core and transfer pathway definitions"
      ],
      [
        "https://www.ivytech.edu/programs/signature-opportunities-for-students/transfer-options/transfer-articulation-agreements/",
        "Current agreements and destination links"
      ]
    ],
    "criteria": [
      "Do not equate transferred credits with admission to a selective major.",
      "No individual transcript evaluation, enrollment or promise of a graduation date."
    ],
    "minutes": 5
  },
  {
    "id": "f7508342-7342-4863-99c5-6d3e9a8b39e0",
    "category": "education",
    "state": "KY",
    "locality": "Bowling Green and Warren County",
    "region": "South",
    "title": "Trace Warren County curriculum references to grade, subject and resource edition",
    "benefit": "Families can distinguish the standards a school teaches from a publisher resource or a statewide recommendation.",
    "scope": "Use the Kentucky Warren County curriculum site, not similarly named districts. Select three public elementary-grade subject references and compare them with KDE's instructional-resource guidance. Record grade, subject, resource title or standards reference, edition/date and whether local adoption is actually documented.",
    "first": "Identify one public grade-and-subject reference and its document date; next check whether it names an adopted resource or only a standard.",
    "output": "A three-reference family guide with edition and adoption evidence, including any teacher-only access limits.",
    "distinctFocus": "Standards versus local instructional resource adoption",
    "sources": [
      [
        "https://sites.google.com/warren.kyschools.us/wcpscurriculum/home",
        "Kentucky WCPS curriculum; some links may require teacher access"
      ],
      [
        "https://www.education.ky.gov/curriculum/books",
        "State adoption guidance and resource-review distinctions"
      ]
    ],
    "criteria": [
      "Do not bypass restricted files or treat a state recommendation as local adoption.",
      "Report inaccessible or undated references without asserting that instruction is missing."
    ],
    "minutes": 5
  },
  {
    "id": "ea8e9c87-e351-4994-9915-372ff311ac73",
    "category": "education",
    "state": "LA",
    "locality": "East Baton Rouge Parish",
    "region": "South",
    "title": "Turn library exam-proctoring terms into a readiness checklist for adult students",
    "benefit": "Distance-learning students can check whether a public library's proctoring conditions match their school's requirements before arranging an exam.",
    "scope": "Read EBRPL's current policy page and linked exam-proctoring policy. Extract residency/card conditions, scheduling, permitted exam formats, supervision limits and computer restrictions. Compare these with one publicly posted exam-provider requirement, naming the provider and policy date.",
    "first": "Verify one library supervision or technology condition; next compare that condition with the selected exam provider's public rule.",
    "output": "A six-question readiness checklist and one evidence-based compatibility comparison with unresolved requirements marked.",
    "distinctFocus": "Proctoring service compatibility and preparation",
    "sources": [
      [
        "https://www.ebrpl.com/about/library-policies/",
        "Current library policy index"
      ],
      [
        "https://www.ebrpl.com/wp-content/uploads/2024/04/ExamProctoring_Policy.pdf",
        "Published proctoring policy; verify current status"
      ]
    ],
    "criteria": [
      "Do not promise that the library or school will approve a particular exam.",
      "No booking, account access, exam content or personal student information."
    ],
    "minutes": 5
  },
  {
    "id": "2b57c08b-63a4-4c48-8a2d-e564e06b2bea",
    "category": "civic-public-information",
    "state": "CT",
    "locality": "Manchester",
    "region": "Northeast",
    "title": "Explain Manchester bulky-item pickup as a sequence residents can check",
    "benefit": "Households can distinguish regular collection from a separately scheduled pickup and avoid using rules for Manchester, New Hampshire.",
    "scope": "Use Manchester, Connecticut's sanitation pages to trace eligibility, accepted bulky-item types, scheduling, limits or fees and set-out timing. Compare one furniture item and one appliance with the detailed collection instructions; leave building-specific eligibility unresolved when necessary.",
    "first": "Verify the service eligibility and scheduling step for one furniture item; next check the appliance-specific exception.",
    "output": "A two-item process guide with the booking-before-set-out sequence, source dates and unresolved conditions.",
    "distinctFocus": "Scheduled municipal collection process",
    "sources": [
      [
        "https://www.manchesterct.gov/Government/Departments/Public-Works/Sanitation-Division/Residential-Curbside-Collection",
        "Connecticut collection guidance and linked rules"
      ]
    ],
    "criteria": [
      "Do not book a pickup or promise an item will be collected.",
      "Separate collection eligibility from disposal advice; do not give hazardous-appliance handling instructions."
    ],
    "minutes": 5
  },
  {
    "id": "93abce8c-5ecb-4a5e-9fef-1dbfeac15a82",
    "category": "civic-public-information",
    "state": "NH",
    "locality": "Keene",
    "region": "Northeast",
    "title": "Reconcile Keene cemetery decoration rules with seasonal removal dates",
    "benefit": "Families and volunteer caretakers can plan visits around the municipality's published decoration and maintenance rules.",
    "scope": "Compare Keene's cemetery brochure and linked ordinance for cut flowers, seasonal decorations and permanent plantings. Record the type of item, permitted period or placement, approval requirement and any stated removal window; identify source date conflicts rather than choosing a convenient rule.",
    "first": "Check one seasonal-decoration rule and its date in the brochure; next compare it with the ordinance section.",
    "output": "A three-item calendar and rule crosswalk with exact sections and any unresolved removal dates.",
    "distinctFocus": "Seasonal cemetery use and maintenance notices",
    "sources": [
      [
        "https://keenenh.gov/parks-trails-recreation/cemeteries/",
        "City cemetery brochure and governing rules"
      ]
    ],
    "criteria": [
      "Do not publish grave-owner information or infer permission to remove objects.",
      "Distinguish a recurring seasonal rule from a one-time maintenance announcement."
    ],
    "minutes": 5
  },
  {
    "id": "df6087f0-edbd-4831-9f30-c90c52182ed4",
    "category": "civic-public-information",
    "state": "SC",
    "locality": "Greenville",
    "region": "South",
    "title": "Distinguish Greenville shed permit exemptions from separate zoning checks",
    "benefit": "Homeowners can identify which official questions remain even when a small accessory structure appears exempt from a building permit.",
    "scope": "Compare the city's permit-exemption page with current zoning and application guidance for a small shed, a larger accessory building and a change of use. Record each source's thresholds, scope and separate approval references; check that pages refer to city limits rather than Greenville County.",
    "first": "Trace the small-shed exemption to its current source and identify one separate zoning check; next inspect the larger-building case.",
    "output": "A three-case source guide distinguishing building, zoning and site-related approvals without deciding a real project.",
    "distinctFocus": "Building exemption versus other approvals",
    "sources": [
      [
        "https://www.greenvillesc.gov/do-you-need-a-permit",
        "Published permit scope; follow current city successors"
      ],
      [
        "https://www.greenvillesc.gov/other-building-permit-information",
        "Application types and separate approvals"
      ]
    ],
    "criteria": [
      "Verify current code dates; an exemption from one permit is not permission to build.",
      "No property-specific determination, application or construction advice."
    ],
    "minutes": 5
  },
  {
    "id": "01d27508-6864-416a-a4d9-88b14e84b449",
    "category": "civic-public-information",
    "state": "TN",
    "locality": "Murfreesboro",
    "region": "South",
    "title": "Clarify who handles Murfreesboro public trees and private-tree questions",
    "benefit": "Residents can find the correct city role before assuming a roadside tree is theirs to prune or remove.",
    "scope": "Compare the Urban Forestry responsibilities page with the current tree ordinance. Map three situations: a city-owned street tree, an uncertain right-of-way tree and a private tree described in the ordinance. Record the agency role, published approval or referral route and ownership information still needed.",
    "first": "Verify the city's stated role for one public-tree situation; next check the ordinance's ownership and approval language.",
    "output": "A three-situation responsibility guide with section citations and unresolved ownership questions.",
    "distinctFocus": "Public-tree authority and property boundaries",
    "sources": [
      [
        "https://www.murfreesborotn.gov/1538/Urban-Forestry",
        "Current city forestry responsibilities"
      ],
      [
        "https://www.murfreesborotn.gov/DocumentCenter/View/128/Tree-Management-Ordinance?bidId=",
        "Tree ordinance; verify against the current code"
      ]
    ],
    "criteria": [
      "Do not infer ownership from curb proximity or diagnose a dangerous tree.",
      "Do not contact officials, mark trees or give pruning/removal instructions."
    ],
    "minutes": 5
  },
  {
    "id": "c9cf7d58-6ccd-4860-aa3b-2a48ae348d68",
    "category": "open-data",
    "state": "IA",
    "locality": "Cedar Falls and Black Hawk County",
    "region": "Midwest",
    "title": "Check Iowa crash-data exports for truncated records before counting them",
    "benefit": "Local transport researchers can avoid publishing incomplete totals when a public map service limits one response.",
    "scope": "Inspect Iowa DOT's crash feature-service metadata. Define a Cedar Falls, 2024 aggregate query using verified field names; compare the count-only response with returned record count and any transfer-limit indicator. Document pagination and coded unknowns without collecting narrative or personal fields.",
    "first": "Verify the service's record limit and one city/year filter field; next compare a count query with the bounded export.",
    "output": "A reproducible aggregate query recipe, completeness check and field notes for a public crash-data extract.",
    "distinctFocus": "API export completeness and pagination",
    "sources": [
      [
        "https://gis.iowadot.gov/agshost/rest/services/Traffic_Safety/Crash_Data/FeatureServer/0",
        "DOT service schema and query metadata"
      ]
    ],
    "criteria": [
      "Count crashes rather than people or vehicles unless the schema explicitly supports another unit.",
      "No crash narratives, personal records, precise home locations or safety rankings."
    ],
    "minutes": 5
  },
  {
    "id": "8b171443-efdf-40f5-b4d2-ff956348b108",
    "category": "open-data",
    "state": "NV",
    "locality": "Carson City school district",
    "region": "Mountain West",
    "title": "Match Carson City schools across Nevada and federal directory identifiers",
    "benefit": "Education researchers can join public school datasets without merging similarly named schools or losing leading zeros.",
    "scope": "Select three Carson City public schools alphabetically from Nevada's current directory. Match each to the NCES CCD locator using school, district and public campus location. Preserve state and federal IDs as text, directory school year and any status mismatch.",
    "first": "Pin the Nevada directory year and match one school to its NCES record; next verify the second school's district association.",
    "output": "A three-school identifier crosswalk with matching evidence, vintage differences and unresolved cases.",
    "distinctFocus": "Cross-system school entity resolution",
    "sources": [
      [
        "https://doe.nv.gov/school-and-district-information",
        "Nevada directory and school-status links"
      ],
      [
        "https://nces.ed.gov/ccd/",
        "CCD locator, identifiers and release documentation"
      ]
    ],
    "criteria": [
      "Do not infer closure from a missing or differently dated federal record.",
      "Use institution records only; no student or staff personal information."
    ],
    "minutes": 5
  },
  {
    "id": "e70e9711-222c-4318-86f4-fd5b5e44520f",
    "category": "open-data",
    "state": "VA",
    "locality": "Roanoke-area elevation tiles",
    "region": "Mid-Atlantic",
    "title": "Document units and missing-value codes for Roanoke elevation-data reuse",
    "benefit": "Community mapping volunteers can avoid treating an elevation raster's missing cells as actual low ground.",
    "scope": "Use VGIN's 2025 DEM directory, usage note, metadata and tile index to identify two tiles covering public areas of Roanoke. Record horizontal and vertical reference, units, cell size, acquisition date and NoData rules. Inspect metadata or small headers only; no statewide raster download is needed.",
    "first": "Read the usage note and identify one documented unit or NoData rule; next match a Roanoke tile to its acquisition record.",
    "output": "Two machine-readable metadata sidecars and a short interpretation note, leaving unspecified fields null.",
    "distinctFocus": "Raster NoData and vertical-unit preservation",
    "sources": [
      [
        "https://vginmaps.vdem.virginia.gov/download/DEM/2025/",
        "Official DEM metadata, usage note and tile index"
      ]
    ],
    "criteria": [
      "Do not infer building heights, flood depths or parcel risk from these metadata.",
      "Keep acquisition, processing and publication dates separate; unknown datum information must not be guessed."
    ],
    "minutes": 5
  },
  {
    "id": "82d8fb17-2ed9-4767-a9fd-7d562274b204",
    "category": "open-data",
    "state": "WI",
    "locality": "Waukesha County",
    "region": "Midwest",
    "title": "Preserve combined reporting units in a Waukesha election-results extract",
    "benefit": "Nonpartisan researchers can reuse certified results without falsely assigning a combined ward total to each ward.",
    "scope": "From the county clerk's November 2024 official results, select one countywide contest and the first five reporting units in source order. Extract exact unit labels and totals; compare the reporting-unit documentation with ward boundaries only to establish grouping, not to allocate votes.",
    "first": "Pin the certified report and transcribe one reporting-unit label with its total; next determine whether that label combines wards.",
    "output": "A five-row CSV and data dictionary preserving combined units, vote-type distinctions and certification date.",
    "distinctFocus": "Grouped election reporting units in structured data",
    "sources": [
      [
        "https://www.waukeshacounty.gov/county-clerks-office/election-information/official-election-results/",
        "Certified reports and reporting-unit documents"
      ]
    ],
    "criteria": [
      "Do not divide combined totals among wards or infer individual behavior.",
      "Preserve source totals and blanks; avoid partisan commentary or campaign use cases."
    ],
    "minutes": 5
  },
  {
    "id": "2f899800-dab9-42c7-8fc5-81c9480629a4",
    "category": "consumer-protection",
    "state": "MA",
    "locality": "Springfield-area homeowners",
    "region": "Northeast",
    "title": "Separate Massachusetts contractor registration from a supervisor license",
    "benefit": "Homeowners can understand what two official credentials establish before treating either as a blanket endorsement.",
    "scope": "Compare the HIC registration and Construction Supervisor License guidance and their official lookup fields. Build a three-step check for exact business/person match, credential type and current status; demonstrate the field checks without publishing a contractor ranking or inventing a violation.",
    "first": "Verify one HIC-versus-CSL distinction and the corresponding lookup field; next check how the other credential's status is displayed.",
    "output": "A two-credential comparison and a source-linked verification checklist with unresolved insurance or scope questions.",
    "distinctFocus": "Credential type and holder matching",
    "sources": [
      [
        "https://www.mass.gov/info-details/home-improvement-contractor-registration-and-renewal",
        "HIC definition and CSL distinction"
      ],
      [
        "https://www.mass.gov/info-details/hic-contractor-resources",
        "Linked credential, contract and consumer references"
      ]
    ],
    "criteria": [
      "Registration, licensing and insurance are separate facts; none is a quality guarantee.",
      "No contractor allegations, hiring recommendations or individual legal determinations."
    ],
    "minutes": 5
  },
  {
    "id": "5aeb585a-e123-4cf6-8ac1-c1b94c0c012c",
    "category": "consumer-protection",
    "state": "NC",
    "locality": "Asheville-area households",
    "region": "South",
    "title": "Check flood-policy waiting-period exceptions against their actual scope",
    "benefit": "Households can distinguish a general preparedness summary from the specific effective-date conditions of a flood policy.",
    "scope": "Compare NC DOI's flood-insurance and storm-preparation pages, then follow their official NFIP references. Make three source-based cases: ordinary purchase, a documented exception and a private-policy question. Preserve the exact program and conditions rather than asserting one waiting period for all policies.",
    "first": "Trace one DOI waiting-period statement to the linked NFIP rule; next check one exception and its stated conditions.",
    "output": "A three-case effective-date reference with dated primary sources and questions left for an insurer.",
    "distinctFocus": "Coverage effective dates and exception scope",
    "sources": [
      [
        "https://www.ncdoi.gov/consumers/homeowners-insurance/flood-insurance",
        "DOI flood coverage and NFIP links"
      ],
      [
        "https://www.ncdoi.gov/consumers/disaster/how-prepare-storm",
        "Short preparedness wording for comparison"
      ]
    ],
    "criteria": [
      "Do not recommend buying a policy or determine anyone's coverage.",
      "Label examples as informational; no promised start date, reimbursement or protection from a current storm."
    ],
    "minutes": 5
  },
  {
    "id": "0c0ecba2-5f9d-40d0-98a8-698c2c4ea62f",
    "category": "consumer-protection",
    "state": "OH",
    "locality": "Columbus-area donors",
    "region": "Midwest",
    "title": "Build an Ohio charity-checking guide that separates registration from tax status",
    "benefit": "Donors can interpret official records without equating state registration, federal exemption and program effectiveness.",
    "scope": "Compare Ohio's Research Charities guidance with the linked IRS tax-exempt search documentation. Map organization identity, state filing status, federal classification and revocation fields; use two public organizational records only if their identifiers can be matched confidently.",
    "first": "Verify one state-registration field and what it establishes; next locate the distinct IRS classification field.",
    "output": "A field-by-field checking guide with up to two matched public examples and explicit limits on conclusions.",
    "distinctFocus": "Charity registration versus federal exemption",
    "sources": [
      [
        "https://charitableregistration.ohioattorneygeneral.gov/Charities/Research-Charities.aspx",
        "Ohio official research guidance and IRS reference links"
      ]
    ],
    "criteria": [
      "Do not infer fraud, effectiveness, deductibility for an individual or endorsement from registry presence.",
      "No donation, solicitation, contact or donor information."
    ],
    "minutes": 5
  },
  {
    "id": "dc32301c-50a6-4d31-ba68-569c38861be5",
    "category": "consumer-protection",
    "state": "OR",
    "locality": "Salem and mid-Willamette Valley",
    "region": "Pacific Northwest",
    "title": "Distinguish Oregon unclaimed-property notices from paid finder offers",
    "benefit": "Residents can locate official no-cost information without mistaking a private solicitation for a required state service.",
    "scope": "Follow Oregon Treasury's current owner guidance to its official claim portal and any proactive-return program. Compare how each route begins, what public verification guidance it gives and whether a fee is stated. Include the separate role of private finders only where current Treasury guidance explains it.",
    "first": "Verify the official portal link and one published fee or notice statement; next check the proactive-return route.",
    "output": "A three-route notice-reading guide with official destinations and questions about unverifiable correspondence.",
    "distinctFocus": "Official property-return routes versus intermediaries",
    "sources": [
      [
        "https://www.oregon.gov/treasury/unclaimed-property/Pages/default.aspx",
        "Treasury owner guidance and official portal"
      ],
      [
        "https://www.oregon.gov/treasury/news-data/the-ledger/Pages/Unclaimed-Property-Program-Proactively-Returns-Millions-in-Unclaimed-Funds.aspx",
        "Dated proactive-return description; verify current successor"
      ]
    ],
    "criteria": [
      "Do not search for individuals, expose owner records, submit claims or collect identity documents.",
      "Do not label a specific message fraudulent or promise a payment."
    ],
    "minutes": 5
  },
  {
    "id": "5031764a-2c55-470a-90b2-8f086b43324d",
    "category": "infrastructure",
    "state": "CA",
    "locality": "Sacramento public charging sites",
    "region": "California",
    "title": "Cross-check public EV charging access and connector counts in Sacramento",
    "benefit": "Travelers and local transport planners can distinguish station listings, charging ports and access restrictions.",
    "scope": "Select three publicly listed Sacramento charging sites alphabetically in AFDC, then compare their network or public operator pages. Record station ID, connector type, port count, access hours and verification date. Treat live availability, payment requirements and future installations as separate fields.",
    "first": "Pin one AFDC station ID and compare its connector count with its operator page; leave the next access-hours check.",
    "output": "A three-site infrastructure reference with discrepancies, source dates and unverified live-status fields.",
    "distinctFocus": "Charging ports and site access reconciliation",
    "sources": [
      [
        "https://afdc.energy.gov/stations",
        "Official station locator"
      ],
      [
        "https://afdc.energy.gov/stations/charging-networks",
        "Data sources and network distinctions"
      ]
    ],
    "criteria": [
      "Do not promise a working charger, compatible vehicle or current price.",
      "No accounts, charging sessions, purchases or private-site access."
    ],
    "minutes": 5
  },
  {
    "id": "ba1b3dd5-4a11-4818-99a4-03f850f34e47",
    "category": "infrastructure",
    "state": "CO",
    "locality": "Durango Transit Center connections",
    "region": "Mountain West",
    "title": "Compare bicycle carriage rules for services meeting at Durango Transit Center",
    "benefit": "Residents combining cycling with regional buses can identify different published equipment limits before planning a connection.",
    "scope": "Use the city Transit Center page to identify Durango Transit, Road Runner and Bustang services. Follow each operator's current rider rules for bike racks, bicycle types, capacity and reservation conditions. Mark missing guidance; a shared terminal does not mean shared carriage rules.",
    "first": "Verify one operator's bike-capacity or bike-type rule; next compare the same field for another terminal operator.",
    "output": "A three-operator bike-carriage matrix with source dates and questions about transfers or full racks.",
    "distinctFocus": "Multimodal equipment compatibility across operators",
    "sources": [
      [
        "https://www.durangoco.gov/350/Transit-Center",
        "City-confirmed terminal operators and links"
      ],
      [
        "https://durangoco.gov/1741/Clean-Transportation",
        "Local cycling and transit starting points"
      ]
    ],
    "criteria": [
      "Do not infer e-bike acceptance from ordinary bicycle acceptance.",
      "No guaranteed space, route recommendation, reservation or physical loading instructions."
    ],
    "minutes": 5
  },
  {
    "id": "b24e724b-50ee-4b99-9019-6f2ee19ca598",
    "category": "infrastructure",
    "state": "ID",
    "locality": "Meridian neighborhoods",
    "region": "Mountain West",
    "title": "Explain Meridian irrigation supply separately from municipal drinking water",
    "benefit": "Households can understand why irrigation service dates and responsibilities may differ from their drinking-water utility.",
    "scope": "Compare Meridian's irrigation explanation with one linked irrigation district's current public season notice. Trace municipal water, district delivery and neighborhood pressurized distribution as separate systems; record which published body controls each stage and what cannot be resolved without a household's provider information.",
    "first": "Verify one city-versus-irrigation ownership statement; next identify the district notice that applies only to its own service area.",
    "output": "A three-stage responsibility diagram in text and a dated season-notice example with coverage limits.",
    "distinctFocus": "Nonpotable irrigation distribution ownership",
    "sources": [
      [
        "https://meridiancity.org/public-works/water/irrigation/",
        "City explanation and irrigation-provider links"
      ]
    ],
    "criteria": [
      "Do not treat irrigation supply as potable or give plumbing/cross-connection instructions.",
      "No household address lookup, service guarantee or inference that one district serves all Meridian homes."
    ],
    "minutes": 5
  },
  {
    "id": "4706afde-67d5-4a28-ae91-33056e20d453",
    "category": "infrastructure",
    "state": "WA",
    "locality": "Seattle, Ballard Locks",
    "region": "Pacific Northwest",
    "title": "Separate Ballard Locks vessel closures from pedestrian access notices",
    "benefit": "People using the locks as a crossing can distinguish a lock-chamber maintenance closure from a closed public walkway.",
    "scope": "Compare USACE's general operations page with its 2026 closure notices. Track large lock, small lock and pedestrian gates separately for three notices or operating statements. Record dates, affected asset and any explicitly stated effect on crossing access.",
    "first": "Check one maintenance notice for exactly which asset closes; next find whether it explicitly mentions pedestrian gates.",
    "output": "A three-asset operating reference with dated notice links and access effects marked confirmed or unstated.",
    "distinctFocus": "Navigation assets versus public crossing operations",
    "sources": [
      [
        "https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/",
        "USACE operating and visitor information"
      ],
      [
        "https://www.nws.usace.army.mil/Missions/Civil-Works/Locks-and-Dams/Chittenden-Locks/Closures/",
        "Current and dated maintenance notices"
      ]
    ],
    "criteria": [
      "Do not infer pedestrian closure from a vessel closure or the reverse.",
      "Do not promise real-time access or invent an alternate route."
    ],
    "minutes": 5
  },
  {
    "id": "fd359cab-4f8b-469a-b79e-b08842ac65a9",
    "category": "humanitarian-public-interest-research",
    "state": "FL",
    "locality": "Tallahassee and Leon County",
    "region": "South",
    "title": "Clarify Leon County special-needs shelter registration and its limits",
    "benefit": "Residents and caregivers can distinguish advance registration, shelter screening and evacuation assistance when preparing questions.",
    "scope": "Compare Leon County's registry page, DOH-Leon's current notice and statewide shelter guidance. Map paper versus online starting points, the publicly described screening step, caregiver expectations and separate transport information. Do not gather anyone's health details.",
    "first": "Verify the county's paper application route; next check what the state guidance says registration does and does not establish.",
    "output": "A three-stage preparation guide with source dates, agency roles and unresolved assistance conditions.",
    "distinctFocus": "Special-needs shelter registration and screening",
    "sources": [
      [
        "https://citizensconnect.leoncountyfl.gov/statewide-special-needs-registry",
        "Local registry and paper route"
      ],
      [
        "https://www.floridahealth.gov/community-environmental-public-health/emergency-preparedness-response/special-needs-shelters/",
        "State shelter scope and expectations"
      ]
    ],
    "criteria": [
      "Registration does not establish an open shelter, accepted placement or hospital-level care.",
      "No medical advice, registration, transport booking or live emergency directions."
    ],
    "minutes": 5
  },
  {
    "id": "bc0f0d7a-ff50-4f3b-8e3e-9757301f6153",
    "category": "humanitarian-public-interest-research",
    "state": "GA",
    "locality": "Athens and northeast Georgia",
    "region": "South",
    "title": "Separate Georgia disaster legal-help references from current civil-aid intake",
    "benefit": "Volunteer navigators can distinguish a historical disaster hotline from an active general civil-help starting point.",
    "scope": "Use GLSP's current Need Help page and its September 2022 disaster manual. Compare geographic coverage, issue types and intake routes for an Athens-area caller; classify three manual referrals as current corroborated, historical only or unconfirmed using the named provider's public page.",
    "first": "Check one manual referral against its provider's current page; next verify whether its service area includes Athens-Clarke County.",
    "output": "A three-referral, dated navigation note separating general intake from event-specific services.",
    "distinctFocus": "Time-limited disaster referrals versus standing services",
    "sources": [
      [
        "https://www.glsp.org/need-help/",
        "Current provider intake and coverage"
      ],
      [
        "https://www.glsp.org/wp-content/uploads/2023/09/Georgia-Disaster-Manual-September-2022.pdf",
        "Historical referral source for rechecking"
      ]
    ],
    "criteria": [
      "Do not promise representation, eligibility or an active disaster hotline.",
      "No case facts, outreach, form submissions or individualized legal advice."
    ],
    "minutes": 5
  },
  {
    "id": "4d39acfb-3e3d-4b43-abdf-f98e9f2fb9a0",
    "category": "humanitarian-public-interest-research",
    "state": "MI",
    "locality": "Traverse City and Grand Traverse County",
    "region": "Midwest",
    "title": "Check the published limits of Grand Traverse veterans medical transportation",
    "benefit": "Veterans and family helpers can prepare the right ride questions without assuming every listed medical facility is served.",
    "scope": "Compare county veterans-affairs transportation information with its facility directory and the relevant VA facility transport pages. Check three destinations for documented service, scheduling lead time, escort or mobility limits and return-trip arrangements. Keep a directory listing distinct from evidence of a ride.",
    "first": "Check whether one listed VA destination has an explicit county or VA transport reference; next verify its published scheduling conditions.",
    "output": "A three-destination evidence table and a short list of unanswered ride-planning questions.",
    "distinctFocus": "Medical transport scope versus facility directory",
    "sources": [
      [
        "https://www.gtcveterans.com/programs/medical/transportation/",
        "County veterans-affairs transportation route"
      ],
      [
        "https://www.gtcveterans.com/programs/medical/va-medical-facilities/",
        "Public facility directory for comparison"
      ]
    ],
    "criteria": [
      "No eligibility decision, medical advice, ride guarantee or appointment details.",
      "Do not contact drivers or publish personal contact information beyond official service channels."
    ],
    "minutes": 5
  },
  {
    "id": "0aa08375-3de6-4bc5-9126-cd6328763053",
    "category": "humanitarian-public-interest-research",
    "state": "MO",
    "locality": "Jefferson City and central Missouri",
    "region": "Midwest",
    "title": "Turn Missouri disaster-volunteering guidance into a coordination checklist",
    "benefit": "Community groups can distinguish a published request for help from a general invitation to volunteer before mobilizing people or goods.",
    "scope": "Compare SEMA's volunteer/donation page with its disaster FAQ and linked voluntary-agency guidance. Separate volunteer registration, requested goods and organizational coordination; record how an event-specific need and authorized receiving organization should be verified in three common scenarios.",
    "first": "Trace one volunteer-information route from the FAQ to its current destination; next check the separate guidance for goods.",
    "output": "A three-scenario coordination checklist with dated links and a field for the current event-specific request.",
    "distinctFocus": "Volunteer and donation coordination before mobilization",
    "sources": [
      [
        "https://sema.dps.mo.gov/recover/volunteers.php/1000",
        "SEMA volunteer and donation coordination"
      ],
      [
        "https://sema.dps.mo.gov/disasterfaqs/",
        "Disaster FAQ and linked organizational routes"
      ]
    ],
    "criteria": [
      "Do not assert a current need or endorse an organization without source support.",
      "No donations, purchases, volunteer registration, outreach or self-deployment instructions."
    ],
    "minutes": 5
  },
  {
    "id": "afc81989-dd3d-4a5f-a362-6b47ed5a8459",
    "category": "archival-historical-research",
    "state": "IL",
    "locality": "Chicago Water Tower",
    "region": "Midwest",
    "title": "Check scale and measurement notes on Chicago Water Tower drawings",
    "benefit": "Local-history educators can reuse measured drawings without treating screen dimensions or later survey notes as original construction measurements.",
    "scope": "Inspect the title, plan and elevation/section sheets in HABS IL-1041. Record printed scale, units, drawing/survey date and one explicitly annotated dimension per sheet where present. Distinguish annotations from dimensions that would require measuring a resized scan.",
    "first": "Read one sheet's scale and date note, citing the sheet number; next compare the same feature on another view.",
    "output": "A three-sheet measurement-provenance table and a short guide to what the scans can and cannot establish.",
    "distinctFocus": "Historic drawing scale and dimensional evidence",
    "sources": [
      [
        "https://www.loc.gov/item/il0097/",
        "HABS IL-1041 catalog, drawings and rights"
      ],
      [
        "https://www.loc.gov/resource/hhh.il0097.sheet/?sp=3",
        "Elevation and section sheet"
      ]
    ],
    "criteria": [
      "Do not use these drawings for present engineering or infer a dimension from display pixels.",
      "Keep building date, survey date and digitization date distinct; cite item rights."
    ],
    "minutes": 5
  },
  {
    "id": "c64dd4b4-0145-4e23-be46-2430feb597b2",
    "category": "archival-historical-research",
    "state": "MD",
    "locality": "Annapolis and Maryland legislative history",
    "region": "Mid-Atlantic",
    "title": "Reconcile Maryland session-law citations with digitized volume and page numbers",
    "benefit": "Researchers and educators can reach the exact historical law page despite differing session, publication and viewer numbering.",
    "scope": "From Archives of Maryland Online, select three acts concerning public roads or bridges in the 1839 session volume, in chapter order. Verify chapter number, printed page, session year, publication title and stable digitized page. Do not summarize these historical laws as current law.",
    "first": "Match one act's chapter and printed page to its viewer page; next check the following relevant chapter.",
    "output": "A three-act citation crosswalk with stable links and a note on session-year versus volume numbering.",
    "distinctFocus": "Historical legal citation and page alignment",
    "sources": [
      [
        "https://www.msa.maryland.gov/megafile/msa/speccol/sc2900/sc2908/html/legislative2.html",
        "Official legislative volume index"
      ],
      [
        "https://msa.maryland.gov/megafile/msa/speccol/sc2900/sc2908/html/volumes7.html",
        "Volume 600 and other session-law volume entries"
      ]
    ],
    "criteria": [
      "Keep historical wording attributed and use brief original summaries.",
      "Do not infer modern rights, current road ownership or an unverified page number."
    ],
    "minutes": 5
  },
  {
    "id": "67dc6636-74e9-4195-987f-15c6539ba7c4",
    "category": "archival-historical-research",
    "state": "NE",
    "locality": "Beatrice and Homestead National Historical Park",
    "region": "Plains",
    "title": "Separate Daniel Freeman homestead filing evidence from the midnight story",
    "benefit": "Teachers can distinguish a documented land-entry timeline from a frequently repeated historical anecdote.",
    "scope": "Use NPS's Daniel Freeman biography and homestead-record guide to identify public evidence for application, final proof and patent dates. Locate accessible primary documents where linked; separately record the source and wording basis of the midnight-filing story. A digitization or access gap is a valid finding.",
    "first": "Verify one date against its named record type; next check whether the midnight claim has a contemporaneous citation.",
    "output": "A three-stage evidence timeline plus a clearly attributed note on the anecdote and missing primary records.",
    "distinctFocus": "Homestead procedural dates versus historical anecdote",
    "sources": [
      [
        "https://home.nps.gov/people/daniel-freeman.htm",
        "NPS biography and qualified historical narrative"
      ],
      [
        "https://home.nps.gov/home/learn/historyculture/requesting-homestead-records.htm",
        "Record organization and state-specific access limits"
      ]
    ],
    "criteria": [
      "No paid archive access, record orders or research into living descendants.",
      "Do not describe Indigenous land as previously unoccupied or turn a legend into a verified event."
    ],
    "minutes": 5
  },
  {
    "id": "3cdf74df-52ef-4749-b3e2-07d443471784",
    "category": "archival-historical-research",
    "state": "VT",
    "locality": "Burlington and Vermont school communities",
    "region": "Northeast",
    "title": "Index school-day entries in a Vermont teacher diary without filling gaps",
    "benefit": "Education historians can locate first-person evidence about school routines without confusing a diarist's experience with statewide practice.",
    "scope": "Use UVM's diaries collection to locate the Lamson diary described as covering teaching around 1910. Select the first three accessible entries explicitly mentioning teaching or school. Record entry date, page identifier, a short original topic summary and ambiguous or illegible words that affect interpretation.",
    "first": "Locate one school-related entry and confirm its date on the page image; next inspect the following relevant entry.",
    "output": "A three-entry finding aid with precise page links, date confidence and limits on generalization.",
    "distinctFocus": "First-person school routine indexing",
    "sources": [
      [
        "https://digitalcollections.uvm.edu/browse/collection/diaries/diaries",
        "Current diary collection and creator filters"
      ],
      [
        "https://digitalcollections.uvm.edu/",
        "Current UVM collection portal if older links moved"
      ]
    ],
    "criteria": [
      "Do not fill missing dates or illegible text from surrounding context alone.",
      "Respect item rights, avoid long quotations and do not generalize one diary to all Vermont schools."
    ],
    "minutes": 5
  },
  {
    "id": "2f63688a-0a60-471a-802b-5e170272d90c",
    "category": "verification-and-fact-checking",
    "state": "MN",
    "locality": "St. Cloud State University",
    "region": "Midwest",
    "title": "Check St. Cloud enrollment comparisons for headcount and census-date mismatches",
    "benefit": "Students and local readers can interpret public enrollment figures without mixing annual attendance, fall headcount and full-time status.",
    "scope": "Compare the fall 2024 and 2025 university factbooks. Trace total headcount and full-time/part-time components to the same census date and population. Recompute one year-to-year comparison where definitions match; separately document any FTE or annual measure encountered.",
    "first": "Verify the total and census-date definition in one factbook; next match the same row in the other year.",
    "output": "A two-year reconciliation with component arithmetic, definitions and one supported or explicitly unsupported change calculation.",
    "distinctFocus": "Enrollment census populations and headcount",
    "sources": [
      [
        "https://www.stcloudstate.edu/AIR/_files/documents/reports/factbook/2024-fall-university-factbook.pdf",
        "Fall 2024 factbook"
      ],
      [
        "https://www.stcloudstate.edu/air/_files/documents/reports/factbook/2025-fall-university-factbook.pdf",
        "Fall 2025 factbook"
      ]
    ],
    "criteria": [
      "Do not equate full-time students with full-time-equivalent enrollment.",
      "No unsupported explanation of enrollment change or ranking of educational quality."
    ],
    "minutes": 5
  },
  {
    "id": "6598d6f9-333b-4b7c-99a7-6723e2a7e2bd",
    "category": "verification-and-fact-checking",
    "state": "MT",
    "locality": "Helena",
    "region": "Mountain West",
    "title": "Verify Helena population-change figures against the same Census vintage",
    "benefit": "Residents and local writers can quote population change without mixing revised estimates, census counts and county geography.",
    "scope": "Trace Helena city's latest QuickFacts population-change figure to the corresponding Census Population Estimates release. Recompute it using the same vintage's April 2020 estimates base and July endpoint; compare that base with the decennial count and explain any documented difference.",
    "first": "Pin the city geography, vintage and estimates-base value; next retrieve the matching endpoint from the same release.",
    "output": "A source-pinned arithmetic check and a three-term explanation of census count, estimates base and revised estimate.",
    "distinctFocus": "Population-estimate revision vintage",
    "sources": [
      [
        "https://www.census.gov/quickfacts/fact/table/helenacitymontana/PST045224",
        "QuickFacts entry; verify displayed vintage rather than URL suffix"
      ],
      [
        "https://www.census.gov/programs-surveys/popest.html",
        "Population Estimates releases and methodology"
      ]
    ],
    "criteria": [
      "Do not substitute Lewis and Clark County or treat an older URL suffix as a frozen dataset.",
      "No causal claims or precision beyond the source's rounding."
    ],
    "minutes": 5
  },
  {
    "id": "f369e739-d210-4dd7-9cb8-e8d45fa11a26",
    "category": "verification-and-fact-checking",
    "state": "NY",
    "locality": "Ithaca",
    "region": "Northeast",
    "title": "Check what Ithaca fire-response totals count before comparing years",
    "benefit": "Residents reading annual service reports can distinguish incidents from apparatus responses and mutual-aid activity.",
    "scope": "Compare the 2024 and 2025 Ithaca Fire Department annual reports. Identify the definitions and categories behind one response-total figure, including mutual aid if documented. Reconcile available components and determine whether the two years count the same unit.",
    "first": "Pin one report's response-total table and identify its counting unit; next find the matching definition in the other year.",
    "output": "A two-year count reconciliation with page citations, missing definitions and a judgment on comparability.",
    "distinctFocus": "Emergency-service incidents versus responses",
    "sources": [
      [
        "https://www.cityofithacany.gov/847/Annual-Reports",
        "Official annual-report index and fire reports"
      ],
      [
        "https://www.cityofithacany.gov/DocumentCenter/View/20460/IFD-End-of-Year-Report-2026?bidId=",
        "2025 report; verify title year rather than filename"
      ]
    ],
    "criteria": [
      "Do not infer response speed, service quality or community danger from response counts.",
      "Do not force totals to match when definitions or component coverage differ."
    ],
    "minutes": 5
  },
  {
    "id": "c0d4b608-0002-4b5f-ac8d-db33032eea5a",
    "category": "verification-and-fact-checking",
    "state": "TX",
    "locality": "San Marcos",
    "region": "Southwest",
    "title": "Distinguish San Marcos projected water use from observed per-person demand",
    "benefit": "Residents discussing water planning can recognize a forecast assumption and avoid quoting it as a measured household usage figure.",
    "scope": "Check the 2020 Water Master Plan's 2025 population, GPCD and average-day demand row against its definitions and TWDB guidance. Reproduce the row's arithmetic, then locate a public observed 2025 measure if available and establish whether its service population and water-use scope match.",
    "first": "Verify that the 2025 row is a projection and check its gallons-to-million-gallons arithmetic; next locate the observed-series definition.",
    "output": "A forecast calculation check and a projection-versus-observation comparison with unresolved scope differences.",
    "distinctFocus": "Planning forecast versus measured water demand",
    "sources": [
      [
        "https://www.sanmarcostx.gov/DocumentCenter/View/23265/Water-Master-Plan---2020",
        "Planning assumptions and projected demand table"
      ],
      [
        "https://www.twdb.texas.gov/waterplanning/waterusesurvey/faq.asp",
        "Water-use survey and service-population guidance"
      ]
    ],
    "criteria": [
      "Do not equate total municipal GPCD with residential household consumption.",
      "If observed data are unavailable or use another scope, report that limit instead of calculating forecast accuracy."
    ],
    "minutes": 5
  },
  {
    "id": "e42f59a0-1972-4750-b22c-94dd95fdfb3c",
    "category": "useful-open-source-public-resource-work",
    "state": "MS",
    "locality": "Hattiesburg and Mississippi Digital Library partners",
    "region": "South",
    "title": "Draft a small metadata checker for Mississippi community collections",
    "benefit": "Small archives contributing to Mississippi Digital Library can catch documented metadata-format issues before preparing an import.",
    "scope": "Read MDL's current metadata guidelines and template. Select three explicitly testable requirements, such as required fields or documented date syntax, and draft a small standalone checker with original pass/fail examples. Separate definite rule violations from fields needing human review; if an equivalent checker is already provided, assess its coverage instead.",
    "first": "Pin the guideline edition and translate one explicit requirement into a check and counterexample; leave the next documented rule to implement.",
    "output": "An original minimal validator or existing-tool coverage note, three source-mapped checks and a short usage/limitations README.",
    "distinctFocus": "Executable checks derived from real archive import rules",
    "sources": [
      [
        "https://msdiglib.org/resources",
        "Official metadata guidelines, template and partner requirements"
      ]
    ],
    "criteria": [
      "Do not invent date rules, infer copyright status or relabel unknown values as invalid.",
      "Use original local code/examples only; do not run downloaded code, upload records or contact archives."
    ],
    "minutes": 5,
    "code": true
  },
  {
    "id": "174cc270-7be4-4c64-9ff0-92d0887e61e3",
    "category": "useful-open-source-public-resource-work",
    "state": "UT",
    "locality": "Provo civic buildings",
    "region": "Mountain West",
    "title": "Prepare an address-field mapping note for Provo public-building data",
    "benefit": "Volunteer geocoding and civic-map maintainers can preserve Utah directional addresses when converting public facility records.",
    "scope": "Inspect UGRC Address Points documentation and three Provo civic-building records, using official facility pages to confirm the institution match. Draft a CSV-to-GeoJSON field mapping that preserves the original address, direction components, identifiers and coordinate reference; include a minimal original conversion fragment only after fields are verified.",
    "first": "Confirm the source field names and one public-building match; next check whether its direction components survive the proposed mapping.",
    "output": "A three-record mapping example, minimal conversion fragment and source/reuse notes for downstream maintainers.",
    "distinctFocus": "Directional address semantics in public-data conversion",
    "sources": [
      [
        "https://gis.utah.gov/products/sgid/location/address-points/",
        "UGRC schema, county vintages and public feature service"
      ],
      [
        "https://gis.utah.gov/products/sgid/location/address-system-quadrants/",
        "Address-system context for directional fields"
      ]
    ],
    "criteria": [
      "Use only public civic buildings, not home addresses; preserve raw text rather than guessing normalization.",
      "Do not claim postal deliverability or emergency-routing accuracy; no uploads or edits to upstream data."
    ],
    "minutes": 5,
    "code": true
  },
  {
    "id": "204534eb-824a-46f4-bbdc-0c53cc004629",
    "category": "useful-open-source-public-resource-work",
    "state": "GU",
    "locality": "Hagåtña, Barrigada and Dededo",
    "region": "Pacific territories",
    "title": "Prepare source-backed Wikidata updates for Guam public-library records",
    "benefit": "Residents, travelers and public-map maintainers can reuse correctly identified library records with traceable official website references.",
    "scope": "Match the Hagåtña, Barrigada and Dededo libraries from GPLS's official directory to existing Wikidata items. Check official-website and namesake/name statements with source references. Draft only supported missing or corrected statements; record already-correct statements or an unresolved item match as useful results.",
    "first": "Match one branch to a Wikidata item and verify one statement against GPLS; next check the reference or remaining branch.",
    "output": "A three-branch statement review with item/property IDs, proposed values, reference URLs and retrieval dates; no upstream edits.",
    "distinctFocus": "Public knowledge-base entity and reference patches",
    "sources": [
      [
        "https://gpls.guam.gov/contact-us/locations-hours/",
        "Official branch names and locations"
      ],
      [
        "https://www.wikidata.org/wiki/Help:References",
        "Statement sourcing and reference properties"
      ]
    ],
    "criteria": [
      "Do not merge branches with the library system or create an item when identity is uncertain.",
      "No Wikidata edits, invented affiliations or copying volatile hours into unsupported properties."
    ],
    "minutes": 5
  },
  {
    "id": "df1bea1f-d4ca-4afe-af9f-185ee00a41c6",
    "category": "useful-open-source-public-resource-work",
    "state": "PR",
    "locality": "Puerto Rico water-data users",
    "region": "Caribbean",
    "title": "Build a bilingual field glossary for Puerto Rico public water-data downloads",
    "benefit": "Spanish-speaking students and community data volunteers can reuse water records while preserving technical meaning and original machine keys.",
    "scope": "Start with USGS's bilingual Puerto Rico water-resources page and one linked public station download. Select six actual fields covering station identity, time, a measured parameter, units and qualification. Pair each raw field key with an original Spanish explanation and the official English definition; flag terminology needing bilingual review.",
    "first": "Pin one station download and define one raw field in both languages with a source; next verify its units or qualifier.",
    "output": "A six-field English/Spanish glossary and one annotated public record that retains raw keys, units and missing values.",
    "distinctFocus": "Bilingual documentation for machine-readable water records",
    "sources": [
      [
        "https://www.usgs.gov/mission-areas/natural-hazards/science/puerto-rico-hazards-water-resources",
        "Bilingual USGS starting point and linked data"
      ],
      [
        "https://water.usgs.gov/glossaries.html",
        "Official hydrologic definitions"
      ]
    ],
    "criteria": [
      "Do not translate machine identifiers, treat gage height as water depth or omit provisional flags.",
      "No flood predictions or drinking-water conclusions; mark draft translations for independent bilingual review."
    ],
    "minutes": 5
  }
];
