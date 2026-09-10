import type {ExpansionBrief} from './public-good-expansion-briefs.ts';

export type RegionalBrief=ExpansionBrief&{
 locality:string;state:string;region:string;distinctFocus:string;
};

// Fixed, additive release. Do not reorder IDs or replace earlier curation.
// Distinct focus documents the actual work, not merely a different place name.
export const regionalBriefs:RegionalBrief[]=[
{
 "benefit": "Homeowners planning a water-saving yard need to distinguish program prerequisites from proposed landscaping rules.",
 "category": "environment",
 "criteria": [
  "Do not promise eligibility, funding, savings or project approval.",
  "Date each policy and distinguish requirements from optional advice."
 ],
 "distinctFocus": "Waterwise landscape project sequencing",
 "first": "Pin the current landscape-program terms and identify one action that must happen before work starts.",
 "locality": "Fort Collins",
 "output": "A six-step project checklist with prerequisite evidence, decision points and unresolved provider-specific conditions.",
 "region": "Mountain West",
 "scope": "Trace one residential lawn-conversion pathway through the city water-conservation page and xeriscape policy update. Assemble a dated sequence for checking water-provider coverage, applying, removing turf and documenting work; separate enacted rules from consultation proposals.",
 "sources": [
  [
   "https://www.fortcollins.gov/Services/Utilities/Programs-and-Rebates/Water-Programs/Residential-Water-Conservation",
   "Residential conservation and linked landscape-program terms"
  ],
  [
   "https://ourcity.fcgov.com/xsa",
   "Xeriscape and soil-amendment policy status"
  ]
 ],
 "state": "CO",
 "title": "Untangle Fort Collins lawn-conversion steps before residents remove turf",
 "id": "7b6d8f02-0001-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Neighborhood tree volunteers need evidence about species concentration before discussing replacement planting.",
 "category": "environment",
 "criteria": [
  "Show denominators and calculations; do not count private trees as inventoried.",
  "Do not prescribe removals or infer current pest damage from historical composition."
 ],
 "distinctFocus": "Urban tree taxonomic concentration",
 "first": "Find the report's inventory date and total tree count; independently recompute one species share.",
 "locality": "Appleton",
 "output": "A five-species concentration table, genus rollup and dated note on what this inventory cannot establish today.",
 "region": "Midwest",
 "scope": "Use the published Appleton i-Tree inventory report to recompute the shares of its five most common species and genera. Preserve the inventory year, public-tree scope and taxonomy, and compare the historical coverage with today's forestry page.",
 "sources": [
  [
   "https://www.itreetools.org/resources/reports/WDNR_Appleton_reports.pdf",
   "Historical Appleton inventory, species totals and report methods"
  ],
  [
   "https://www.appletonwi.gov/government/departments/public_works/forestry/index.php",
   "Current municipal forestry remit"
  ]
 ],
 "state": "WI",
 "title": "Calculate Appleton street-tree diversity without presenting old inventory as current",
 "id": "7b6d8f02-0002-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Residents near urban streams need to see which promised pollution-prevention actions have documented follow-through.",
 "category": "environment",
 "criteria": [
  "A missing report is an evidence gap, not proof that work did not occur.",
  "Do not mistake upload date or report filename for the reporting period."
 ],
 "distinctFocus": "Stormwater commitments versus documented delivery",
 "first": "Pin both report periods and trace one commitment to a dated supporting passage.",
 "locality": "Nashua",
 "output": "A three-commitment, two-period evidence tracker with a clear distinction between promised, reported and independently demonstrated outcomes.",
 "region": "Northeast",
 "scope": "Select three recurring public-education or illicit-discharge program commitments in the two latest available Nashua MS4 annual reports. Track original wording, reporting period, evidence of activity and unresolved follow-up, without treating activity as measured water-quality improvement.",
 "sources": [
  [
   "https://www.nashuanh.gov/1456/Stormwater-Management",
   "MS4 program and linked annual reports"
  ],
  [
   "https://www.epa.gov/system/files/documents/2026-03/nashua_nh_ar22.pdf",
   "EPA-hosted Nashua report; verify its actual reporting period"
  ]
 ],
 "state": "NH",
 "title": "Track Nashua stormwater commitments across two annual reports",
 "id": "7b6d8f02-0003-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Homeowner associations need a practical way to document winter salt use and discuss chloride reduction with maintenance providers.",
 "category": "environment",
 "criteria": [
  "Never promise an ice-free surface or replace trained maintenance judgment.",
  "Separate measured amounts, estimates and recommended application rates."
 ],
 "distinctFocus": "Road-salt application quantities and uncertainty",
 "first": "Pin the manual edition and design the area-and-quantity fields with one labeled arithmetic example.",
 "locality": "Twin Cities suburbs",
 "output": "A printable salt-use log, two checked unit examples and a short guide to the limits of comparing different products and weather.",
 "region": "Midwest",
 "scope": "Locate MPCA Smart Salting guidance and its winter parking-lot/sidewalk manual. Design an original blank log for treated area, product, pavement temperature, amount applied and recovered excess. Include two clearly hypothetical unit conversions, not a prescribed treatment dose.",
 "sources": [
  [
   "https://www.pca.state.mn.us/",
   "Find the named Smart Salting program and current winter-maintenance manual"
  ],
  [
   "https://stormwater.pca.state.mn.us/",
   "Road salt and chloride guidance; retain exact manual references"
  ]
 ],
 "state": "MN",
 "title": "Make a salt-use recording sheet for Twin Cities neighborhood sidewalks",
 "id": "7b6d8f02-0004-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Families starting a small compost pile need to diagnose common failures without confusing backyard methods with municipal processing.",
 "category": "environment",
 "criteria": [
  "Use household plant-material composting only; exclude sewage, carcasses and hazardous materials.",
  "Do not invent temperature, treatment or sanitation guarantees."
 ],
 "distinctFocus": "Backyard compost diagnosis",
 "first": "Retrieve the linked Nebraska Extension guide and draft the odor and dryness entries in original wording.",
 "locality": "Lincoln",
 "output": "A six-symptom troubleshooting card and a short backyard-versus-commercial processing note.",
 "region": "Plains",
 "scope": "Follow the municipal backyard-compost resources to Nebraska Extension and EPA guidance. Develop six symptom-to-question entries covering odors, dryness, excessive moisture, slow breakdown, pests and unfinished material, with source-supported limits and excluded inputs.",
 "sources": [
  [
   "https://cityofwayne.org/819/Backyard-Composting",
   "Municipal links to Lincoln backyard composting, Nebraska Extension and EPA"
  ]
 ],
 "state": "NE",
 "title": "Build a backyard-compost troubleshooting card for Lincoln households",
 "id": "7b6d8f02-0005-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Residents using wood heat need to understand why an air-quality number and a legal burn restriction are different notices.",
 "category": "environment",
 "criteria": [
  "Do not infer current restrictions from weather or AQI alone.",
  "Do not offer medical advice, legal determinations or appliance operating instructions."
 ],
 "distinctFocus": "Air-quality notices and wood-burning restrictions",
 "first": "Extract the exact scope of one restriction stage and identify the official source for checking current status.",
 "locality": "Spokane area",
 "output": "A restriction-stage reference table with a separate AQI explanation and a reusable status-check note.",
 "region": "Pacific",
 "scope": "Read Spokane Clean Air's restriction and wood-heating pages. Build a dated decision-reference table for the agency's published restriction stages, appliance categories and explicitly documented exceptions; explain separately what an AQI reading represents.",
 "sources": [
  [
   "https://spokanecleanair.org/burning/burn-restrictions/",
   "Current restriction stages and official exceptions"
  ],
  [
   "https://spokanecleanair.org/burning/wood-heating/",
   "Wood-heating guidance and links to current air information"
  ]
 ],
 "state": "WA",
 "title": "Separate Spokane air-quality readings from wood-burning restriction stages",
 "id": "7b6d8f02-0006-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Parents and commuters walking through construction areas need notices that distinguish vehicle detours from pedestrian access.",
 "category": "public-safety",
 "criteria": [
  "No field visits or claims that a route is safe or physically accessible.",
  "Do not infer a usable crossing from a line on a vehicle map."
 ],
 "distinctFocus": "Pedestrian continuity in road-work notices",
 "first": "Pin one notice and check whether its vehicle-detour map says anything explicit about walking access.",
 "locality": "Rochester",
 "output": "A three-notice gap audit and one original pedestrian-focused rewrite with unresolved route details marked.",
 "region": "Midwest",
 "scope": "Select three current or most recently archived city road-work notices linked from Rochester's streets pages. Record whether each names affected sidewalks, crossing points, dates and an accessible alternative. Draft one clearer notice using only published information.",
 "sources": [
  [
   "https://www.rochestermn.gov/streets-parking-transit/",
   "Road closures, pedestrian impacts and city project notices"
  ],
  [
   "https://www.rochestermn.gov/streets-parking-transit/traffic/",
   "Traffic controls and responsible city function"
  ]
 ],
 "state": "MN",
 "title": "Check whether Rochester road-work notices explain pedestrian detours",
 "id": "7b6d8f02-0007-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Neighborhood groups need a precise explanation of siren tests, warning cycles and the limits of outdoor coverage.",
 "category": "public-safety",
 "criteria": [
  "A coverage buffer is not a guarantee of audibility inside a home.",
  "Do not announce an active warning or infer an all-clear from silence."
 ],
 "distinctFocus": "Outdoor siren sound-cycle interpretation",
 "first": "Check the official meaning of a pause between siren cycles and draft one scenario with a cited answer.",
 "locality": "Olathe and Johnson County",
 "output": "Five original scenario cards and a dated source note for neighborhood preparedness meetings.",
 "region": "Plains",
 "scope": "Reconcile county siren guidance, the coverage-map legend and Lenexa's published explanation. Create five short scenarios distinguishing scheduled tests, weather-delayed tests, warning pauses, indoor audibility and the end of a warning.",
 "sources": [
  [
   "https://www.jocogov.org/department/emergency-management/outdoor-warning-sirens",
   "Test schedule and operational meaning"
  ],
  [
   "https://www.jocogov.org/department/emergency-management/outdoor-warning-sirens/warning-siren-map",
   "Coverage-map qualifications"
  ],
  [
   "https://www.lenexa.com/City-Services/Public-Safety/Emergency-Preparedness/Outdoor-Warning-Sirens",
   "Published pause and all-clear explanation"
  ]
 ],
 "state": "KS",
 "title": "Explain Johnson County siren pauses without implying an all-clear",
 "id": "7b6d8f02-0008-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Families sharing paths with e-bikes and scooters need to identify which device and surface a rule actually covers.",
 "category": "public-safety",
 "criteria": [
  "Do not treat consultation tables as enacted law.",
  "Preserve jurisdiction, device classification and surface restrictions; no riding-safety guarantees."
 ],
 "distinctFocus": "Electric mobility class and surface permissions",
 "first": "Pin the current page date and check one class-3 e-bike example against the consultation's status.",
 "locality": "Fort Collins",
 "output": "A six-example reference sheet with an enacted/proposed distinction and trail-manager caveats.",
 "region": "Mountain West",
 "scope": "Compare the current electric-mobility guidance with the Which Wheels Go Where consultation. Build six device/surface examples involving e-bike classes, scooters, toy vehicles, paved paths and unpaved trails, clearly separating enacted guidance from proposals.",
 "sources": [
  [
   "https://www.fortcollins.gov/Services/Transportation-and-Roads/Getting-Around-Town/Electric-Mobility",
   "Current device definitions and public guidance"
  ],
  [
   "https://ourcity.fcgov.com/which-wheels-go-where",
   "Consultation material and policy status"
  ]
 ],
 "state": "CO",
 "title": "Reconcile Fort Collins e-bike guidance with proposed rule changes",
 "id": "7b6d8f02-0009-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Commuters need to know how declared emergency hours affect street parking and temporary parking alternatives.",
 "category": "public-safety",
 "criteria": [
  "Label the event hypothetical and never suggest an emergency is currently active.",
  "Do not invent grace periods, available spaces or fee waivers."
 ],
 "distinctFocus": "Snow-emergency parking time windows",
 "first": "Compare when temporary parking becomes available across both pages and document any unresolved difference.",
 "locality": "Nashua",
 "output": "An original example timeline, parking-reference table and checklist of details needed from each actual declaration.",
 "region": "Northeast",
 "scope": "Reconcile the city snow-emergency page and street-department FAQ. Use one explicitly hypothetical announcement to show announcement time, effective hours, permitted temporary parking and the point when normal rules resume; identify any timing detail the city leaves unstated.",
 "sources": [
  [
   "https://www.nashuanh.gov/483/Snow-Emergencies",
   "Declared hours and named parking alternatives"
  ],
  [
   "https://www.nashuanh.gov/faq.aspx?TID=31",
   "Street-department FAQ and qualifications"
  ]
 ],
 "state": "NH",
 "title": "Turn Nashua snow-parking rules into a clear event timeline",
 "id": "7b6d8f02-000a-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Households preparing for storm outages need short warnings that retain critical carbon-monoxide precautions.",
 "category": "public-safety",
 "criteria": [
  "Do not supply wiring, fuel-handling or generator-installation instructions.",
  "Retain agency caveats exactly in meaning; no claim that any placement is guaranteed safe."
 ],
 "distinctFocus": "Generator warning-message completeness",
 "first": "Pin the CDC guidance and identify the essential placement and enclosure cautions that a short warning must retain.",
 "locality": "Chesapeake",
 "output": "A source-backed message checklist, three labeled practice drafts and one corrected plain-language warning.",
 "region": "Southeast",
 "scope": "Use current CDC carbon-monoxide guidance and Chesapeake's emergency-preparedness links to create an editorial checklist for generator warning messages. Evaluate three clearly invented warning drafts, identifying omissions rather than designing or operating electrical equipment.",
 "sources": [
  [
   "https://www.cdc.gov/",
   "Locate Prevent Carbon Monoxide Poisoning under Natural Disasters; pin its current URL and date"
  ],
  [
   "https://www.cityofchesapeake.net/347/Know-Your-Zone",
   "Local emergency-preparedness context and linked hurricane resources"
  ]
 ],
 "state": "VA",
 "title": "Check generator warning messages for Chesapeake storm preparation",
 "id": "7b6d8f02-000b-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Residents near park and downtown crossings need to avoid treating a missing routine horn as evidence that no train is approaching.",
 "category": "public-safety",
 "criteria": [
  "A 2017 construction notice cannot establish current operating status.",
  "Do not recommend crossing behavior beyond current official guidance or promise a crossing is safe."
 ],
 "distinctFocus": "Railroad quiet-zone limitations",
 "first": "Identify the local notice's year and one FRA qualification that prevents equating quiet with train-free.",
 "locality": "Salem",
 "output": "A three-crossing historical/current-status table and an original quiet-zone explanation for park visitors.",
 "region": "Pacific",
 "scope": "Pair Salem's dated crossing-improvement notice with current FRA quiet-zone guidance. Separate construction history, verified current designation, routine horn rules and permitted horn use; create a short family-facing explanation without certifying any crossing.",
 "sources": [
  [
   "https://www.cityofsalem.net/community/things-to-do/downtown/railroad-crossing-safety-improvements-at-court-street-ne-state-street-and-minto-island-road-s",
   "Dated local crossing-project context"
  ],
  [
   "https://railroads.dot.gov/railroad-safety/divisions/crossing-safety-and-trespass-prevention/train-horn-rulequiet-zones",
   "FRA horn and quiet-zone guidance"
  ]
 ],
 "state": "OR",
 "title": "Explain what Salem railroad quiet zones do and do not mean",
 "id": "7b6d8f02-000c-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Families planning an adaptive fishing outing need fishing-specific details that a general park accessibility label may omit.",
 "category": "accessibility",
 "criteria": [
  "Do not infer dock dimensions, edge protection or transfer suitability from photographs.",
  "A published accessibility label is not a personal suitability or current-condition guarantee."
 ],
 "distinctFocus": "Adaptive fishing trip preparation",
 "first": "Choose one named fishing site and separate documented fishing access from general park amenities.",
 "locality": "Boise",
 "output": "A fishing-outing preparation checklist with two source-linked site records and a list of information still requiring local confirmation.",
 "region": "Mountain West",
 "scope": "Use Boise's accessible-recreation page and linked fishing-pond records to document two sites. Focus on dock or bank access, fishing platforms, nearby accessible toilets, parking and any published transfer or equipment information; mark dimensions and on-site conditions unknown when unstated.",
 "sources": [
  [
   "https://www.cityofboise.org/departments/parks-and-recreation/accessible-recreation/",
   "Accessible fishing facilities and linked park records"
  ]
 ],
 "state": "ID",
 "title": "Fill the information checklist for an accessible Boise fishing outing",
 "id": "7b6d8f02-000d-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Families need to plan assistance, support-person arrangements and lead time when choosing an ordinary recreation class.",
 "category": "accessibility",
 "criteria": [
  "Do not request accommodations or collect disability information.",
  "Distinguish an available request process from a guaranteed staffing arrangement."
 ],
 "distinctFocus": "Recreation accommodation request timing",
 "first": "Identify the published request lead time and whether it applies equally to city and partner programs.",
 "locality": "Plymouth",
 "output": "A registration-stage accommodation planner with three program examples and unresolved policy gaps.",
 "region": "Midwest",
 "scope": "Trace the city's inclusion policy and three linked program listings. Record request timing, staff contact role, support-person conditions and whether published details differ between city programs and partner offerings.",
 "sources": [
  [
   "https://www.plymouthmn.gov/departments/parks-recreation/adaptive-and-inclusive-recreation",
   "Inclusion process, support requests and partner references"
  ],
  [
   "https://www.plymouthmn.gov/departments/parks-recreation",
   "Program listings"
  ]
 ],
 "state": "MN",
 "title": "Map Plymouth recreation accommodation steps before program registration",
 "id": "7b6d8f02-000e-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Deaf and hard-of-hearing residents need to locate usable meeting records without guessing which video platform has captions.",
 "category": "accessibility",
 "criteria": [
  "A video link alone does not demonstrate captions or a transcript.",
  "Treat inaccessible players as unverified; do not bypass controls or invent a transcript."
 ],
 "distinctFocus": "Meeting caption and transcript discoverability",
 "first": "Trace one meeting from agenda to recording and document whether a caption or transcript option is explicitly exposed.",
 "locality": "West Hartford",
 "output": "A three-meeting communication-access audit and a short original guide to the verified route.",
 "region": "Northeast",
 "scope": "Follow the town meetings page to the three latest completed Town Council meetings with published records. Check for transcript, caption-track or accommodation information and compare agenda dates with recording dates. Supply exact public links; do not grade auto-caption accuracy without examining it.",
 "sources": [
  [
   "https://www.westhartfordct.gov/government-services/meetings-agendas",
   "Council agenda, minutes and recording routes"
  ]
 ],
 "state": "CT",
 "title": "Audit caption and transcript access for West Hartford public meetings",
 "id": "7b6d8f02-000f-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Residents using screen readers need program registration details in a clear linear order.",
 "category": "accessibility",
 "criteria": [
  "Do not claim PDF/UA or WCAG conformance without the required testing.",
  "Preserve program qualifiers and footnotes; publish only the minimum necessary source facts."
 ],
 "distinctFocus": "Accessible recreation brochure reading order",
 "first": "Pin the guide edition and reconstruct one table row with its header labels and footnotes.",
 "locality": "Cary",
 "output": "One accessible text companion, a reading-order explanation and a checklist of facts requiring confirmation.",
 "region": "Southeast",
 "scope": "Find the current Cary recreation program guide from the official site. Select one registration or senior-program page containing a table, headings or sidebars. Transcribe the necessary facts into an original structured text companion with explicit labels, dates and source page references.",
 "sources": [
  [
   "https://www.carync.gov/",
   "Find the current recreation program guide and accessibility information; pin the exact PDF edition"
  ]
 ],
 "state": "NC",
 "title": "Create a text-first version of one Cary recreation registration section",
 "id": "7b6d8f02-0010-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Residents need to understand how reported access barriers become project priorities rather than assuming a score means a repair is funded.",
 "category": "accessibility",
 "criteria": [
  "No invented weights or claims about the accessibility of a specific location.",
  "A planned improvement is not a completed repair or legal compliance finding."
 ],
 "distinctFocus": "ADA barrier prioritization explainability",
 "first": "Pin the plan's version and identify which factors rank barriers versus authorize spending.",
 "locality": "Maple Valley",
 "output": "A plain-language scoring worksheet, one traceable example and a ranking-versus-funding explanation.",
 "region": "Pacific",
 "scope": "Locate the city ADA transition plan and its prioritization method. Extract the actual factors, weights and tie-breaking rules. Reconstruct one published example if present, or label a small synthetic example clearly, preserving any missing method details.",
 "sources": [
  [
   "https://maplevalleywa.gov/",
   "Locate the named ADA Transition Plan, adoption status and prioritization section"
  ]
 ],
 "state": "WA",
 "title": "Explain Maple Valley's ADA project-priority method with a worked example",
 "id": "7b6d8f02-0011-4c69-a638-b4502e9d3a17"
},
{
 "benefit": "Residents with limited mobility need to retain library access without confusing remote card renewal with material delivery.",
 "category": "accessibility",
 "criteria": [
  "Do not ask for a patron's identity, address, health details or card number.",
  "Do not equate renewal eligibility with delivery eligibility or availability."
 ],
 "distinctFocus": "Homebound library renewal continuity",
 "first": "Check the remote renewal route and record whether the same page actually promises home delivery.",
 "locality": "Round Rock",
 "output": "A two-process access guide with document categories, contact routes and explicitly unknown turnaround times.",
 "region": "South Central",
 "scope": "Compare the library card page, Library at Home service and books/services directory. Trace an existing-card renewal and a material request as separate processes, keeping residency, documentation and published contact methods distinct.",
 "sources": [
  [
   "https://www.roundrocktexas.gov/city-departments/library-home/how-do-i/get-a-card/",
   "Card renewal and unable-to-visit guidance"
  ],
  [
   "https://www.roundrocktexas.gov/city-departments/library-home/books-services/",
   "Library at Home service link and scope"
  ]
 ],
 "state": "TX",
 "title": "Clarify Round Rock library renewals for residents unable to visit",
 "id": "7b6d8f02-0012-4c69-a638-b4502e9d3a17"
},
{
 "category": "science",
 "locality": "Madison",
 "state": "WI",
 "region": "Midwest",
 "distinctFocus": "Lake-ice season arithmetic",
 "title": "Recompute Madison lake-ice durations across interrupted freeze seasons",
 "benefit": "Teachers and lake groups need to avoid counting every day between first freeze and final thaw as continuous ice cover.",
 "scope": "Use the state climatology records for Mendota and Monona. Select three seasons with sufficient metadata, including an interrupted or unusually short season if documented. Recalculate durations using the published definition and explain inclusive-day and winter-year conventions.",
 "sources": [
  [
   "https://climatology.nelson.wisc.edu/first-order-station-climate-data/madison-climate/lake-ice/",
   "Lake-ice definitions and linked annual records"
  ],
  [
   "https://climatology.nelson.wisc.edu/first-order-station-climate-data/madison-climate/lake-ice/history-of-ice-freezing-and-thawing-on-lake-mendota/",
   "Mendota freeze/thaw history"
  ]
 ],
 "first": "Pin one season's freeze and thaw dates and reproduce its published duration using the stated convention.",
 "output": "A three-season calculation table and a short explanation suitable for a community lake newsletter.",
 "criteria": [
  "Do not infer ice thickness or safety for walking, fishing or skating.",
  "Document interruptions and convention differences instead of forcing totals to agree."
 ],
 "id": "7b6d8f02-0013-4c69-a638-b4502e9d3a17"
},
{
 "category": "science",
 "locality": "Burlington",
 "state": "VT",
 "region": "Northeast",
 "distinctFocus": "Lake-gauge vertical datum",
 "title": "Keep Lake Champlain water heights tied to the correct vertical datum",
 "benefit": "Community researchers comparing lake levels need to avoid treating differently referenced heights as a real change in water level.",
 "scope": "Inspect USGS station 04294500 metadata and its available historical series. Record parameter code, units, datum, revisions and data qualification. Reproduce a seven-day daily-value extract; explain any documented datum transition without inventing a conversion.",
 "sources": [
  [
   "https://waterdata.usgs.gov/monitoring-location/USGS-04294500/",
   "Burlington gauge metadata, daily data and datum notes"
  ]
 ],
 "first": "Identify the parameter and vertical datum for one published daily height, preserving its qualification flag.",
 "output": "A seven-day data extract, metadata record and comparison rule for later researchers.",
 "criteria": [
  "Keep gage height, elevation and datum offsets distinct.",
  "No flood forecasts or conversion across datums without a source-supported transformation."
 ],
 "id": "7b6d8f02-0014-4c69-a638-b4502e9d3a17"
},
{
 "category": "science",
 "locality": "Flagstaff",
 "state": "AZ",
 "region": "Mountain West",
 "distinctFocus": "Skyglow measurement versus fixture specifications",
 "title": "Separate Flagstaff sky-brightness evidence from lighting-product claims",
 "benefit": "Neighborhood groups discussing exterior lighting need to understand what astronomical observations and lamp specifications each measure.",
 "scope": "Use Lowell Observatory's dark-sky material and the city history to trace three quantitative or technical claims to their underlying references. Distinguish sky-brightness measurements, lamp color temperature, light output and shielding, recording what evidence would be needed to connect them.",
 "sources": [
  [
   "https://lowell.edu/about-us/dark-skies/",
   "Observatory explanation and research references"
  ],
  [
   "https://www.flagstaff.az.gov/3855/Dark-Sky-History-in-Flagstaff",
   "Local dark-sky history and policy context"
  ]
 ],
 "first": "Select one measurement claim and identify its observable quantity, units and cited evidence.",
 "output": "A three-claim evidence map and a six-term measurement glossary for a neighborhood lighting discussion.",
 "criteria": [
  "Do not convert lamp temperature into sky brightness or promise a product's environmental effect.",
  "Separate historical designation from current measured conditions."
 ],
 "id": "7b6d8f02-0015-4c69-a638-b4502e9d3a17"
},
{
 "category": "science",
 "locality": "Ames",
 "state": "IA",
 "region": "Plains",
 "distinctFocus": "Soil-sensor depth and aggregation",
 "title": "Build a depth-aware soil-moisture sample for Ames community gardens",
 "benefit": "Garden educators need to avoid comparing shallow and deep sensors or instantaneous and daily values as if they were interchangeable.",
 "scope": "Choose one Ames-area station in the Iowa State soil-moisture network and a complete seven-day period. Extract up to two published depths with units, sampling interval, daily aggregation and missing flags. State station coverage limits for individual gardens.",
 "sources": [
  [
   "https://mesonet.agron.iastate.edu/agclimate/",
   "Station inventory and soil-moisture network documentation"
  ],
  [
   "https://mesonet.agron.iastate.edu/agweather/",
   "Aggregation tools and depth-specific products"
  ]
 ],
 "first": "Pin one station, date and sensor depth; preserve its measurement units and missing-data code.",
 "output": "A two-depth seven-day comparison and a reproducible data-selection note for garden educators.",
 "criteria": [
  "Do not turn the sample into irrigation instructions or a forecast.",
  "Missing observations remain missing; label station-to-garden representativeness limits."
 ],
 "id": "7b6d8f02-0016-4c69-a638-b4502e9d3a17"
},
{
 "category": "science",
 "locality": "Raleigh",
 "state": "NC",
 "region": "Southeast",
 "distinctFocus": "Rainfall anomaly calculation",
 "title": "Create a reproducible Raleigh rainfall-versus-normal calculation",
 "benefit": "School and neighborhood weather observers need to distinguish monthly rainfall totals from daily forecasts and long-term normals.",
 "scope": "Choose one completed month at Raleigh-Durham with an official total and the matching 1991–2020 monthly normal. Calculate the absolute difference and percent of normal, preserving station, period, units and any provisional flag; explain the difference between percent of normal and percent change.",
 "sources": [
  [
   "https://www.weather.gov/wrh/climate?wfo=rah",
   "Raleigh climate records and station selection"
  ],
  [
   "https://www.ncei.noaa.gov/access/us-climate-normals/",
   "Official station normals"
  ],
  [
   "https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals",
   "Normal-period and calculation documentation"
  ]
 ],
 "first": "Pin one completed month's rainfall and its matching station-month normal.",
 "output": "A checked calculation sheet, source identifiers and an original explanatory caption.",
 "criteria": [
  "Use the same station, month and units for both inputs.",
  "Do not infer a trend, cause, drought classification or future rainfall from one month."
 ],
 "id": "7b6d8f02-0017-4c69-a638-b4502e9d3a17"
},
{
 "category": "science",
 "locality": "Oahu",
 "state": "HI",
 "region": "Pacific",
 "distinctFocus": "Shoreline-change transect uncertainty",
 "title": "Preserve uncertainty in a small Oahu shoreline-change extract",
 "benefit": "Residents and coastal educators need to avoid treating historical shoreline-change rates as predictions for an individual property.",
 "scope": "Use the University of Hawaii shoreline study to select three adjacent public transects in one documented Oahu study reach. Record shoreline definition, observation years, rate, uncertainty and any hardening or exclusion flags.",
 "sources": [
  [
   "https://www.soest.hawaii.edu/crc/hawaii-shoreline-study-web-map/",
   "Study methods, transects and downloadable shoreline products"
  ]
 ],
 "first": "Pin one transect ID and extract its rate together with the uncertainty and observation period.",
 "output": "A three-transect evidence table and a plain-language uncertainty caption.",
 "criteria": [
  "No property-risk ratings, setback advice or unsupported future extrapolation.",
  "Keep erosion/accretion sign conventions and omitted transects explicit."
 ],
 "id": "7b6d8f02-0018-4c69-a638-b4502e9d3a17"
},
{
 "category": "education",
 "locality": "Colorado Springs",
 "state": "CO",
 "region": "Mountain West",
 "distinctFocus": "Prior-learning credit evidence planning",
 "title": "Map work-experience evidence to Pikes Peak prior-learning credit routes",
 "benefit": "Working adults returning to college need to identify which prior-learning route is worth asking an adviser about.",
 "scope": "Locate Pikes Peak State College's current prior-learning assessment policy. Compare portfolio, exam and industry-credential routes for one published program, recording evidence categories, assessment steps, published fees and limits without evaluating a real person's experience.",
 "sources": [
  [
   "https://www.pikespeak.edu/",
   "Locate Prior Learning Assessment/Credit for Prior Learning and its current program policy"
  ]
 ],
 "first": "Pin the current policy and document one credential route with its required evidence and decision-maker.",
 "output": "A three-route learning-credit planning worksheet and one clearly fictional learner example.",
 "criteria": [
  "Do not promise credit, transfer, admission or an employment outcome.",
  "Use current institution-specific policy, not a third-party credit estimate."
 ],
 "id": "7b6d8f02-0019-4c69-a638-b4502e9d3a17"
},
{
 "category": "education",
 "locality": "Fort Wayne",
 "state": "IN",
 "region": "Midwest",
 "distinctFocus": "Scale and design planning lesson",
 "title": "Create a paper-first scale-design lesson for Fort Wayne library makers",
 "benefit": "Families can learn scale, dimensions and design constraints before reserving unfamiliar fabrication equipment.",
 "scope": "Use Allen County Public Library's Studio equipment descriptions to design a 20-minute paper-only activity for an original desk organizer. Include a scaled sketch, measurement questions and an answer key; treat machine use as a separate supervised step.",
 "sources": [
  [
   "https://www.acpl.lib.in.us/the-studio",
   "Studio capabilities, public participation rules and learning context"
  ]
 ],
 "first": "Choose a simple organizer design and write two checked scale-conversion questions using labeled hypothetical dimensions.",
 "output": "An original paper worksheet, scaled-dimension example and answer key with a library-preparation note.",
 "criteria": [
  "No machine settings, cutting instructions or claims that the design was fabricated.",
  "Keep any actual equipment limits separate from hypothetical lesson dimensions."
 ],
 "id": "7b6d8f02-001a-4c69-a638-b4502e9d3a17"
},
{
 "category": "education",
 "locality": "Seattle area",
 "state": "WA",
 "region": "Pacific",
 "distinctFocus": "Offline file-management practice",
 "title": "Build an offline file-management practice pack for Seattle library learners",
 "benefit": "Adults learning everyday computer skills need exercises they can practice without a paid account or personal documents.",
 "scope": "Use Seattle Public Library's technology-skills resources to build four original exercises on naming files, folders, versions and finding a misplaced document. Provide a fictional file list, worked examples and an answer key; classify linked follow-up resources by login and connectivity requirements.",
 "sources": [
  [
   "https://www.spl.org/programs-and-services/learning/technology-skills",
   "Technology-learning resource list"
  ],
  [
   "https://www.spl.org/online-resources/online-learning/northstar-digital-literacy",
   "Northstar access and subject coverage"
  ]
 ],
 "first": "Write the fictional file list and one exercise that distinguishes renaming from making a new version.",
 "output": "A four-exercise printable pack, answer key and source-linked next-learning options.",
 "criteria": [
  "Use fictional filenames and no personal information.",
  "Do not copy proprietary lesson content or claim completion of a certification."
 ],
 "id": "7b6d8f02-001b-4c69-a638-b4502e9d3a17"
},
{
 "category": "education",
 "locality": "Green Bay",
 "state": "WI",
 "region": "Midwest",
 "distinctFocus": "Financial-aid letter literacy",
 "title": "Teach Green Bay families to separate grants, loans and net college cost",
 "benefit": "College-bound families need practice reading an aid offer without adding borrowing to free aid.",
 "scope": "Use UW–Green Bay's financial-aid learning resources to create two fictional award letters for the same cost of attendance. Write five arithmetic and interpretation questions that separate grants, loans, work-study, billed costs and other expenses.",
 "sources": [
  [
   "https://www.uwgb.edu/financial-aid/advice/money-management/",
   "Institutional financial-literacy resources and linked official guidance"
  ]
 ],
 "first": "Create one clearly fictional award-letter example and check the grant-only net-cost calculation.",
 "output": "Two original practice letters, five questions and a worked answer key with terminology sources.",
 "criteria": [
  "Label every amount fictional; do not imply an actual university offer.",
  "No individualized borrowing or investment recommendation; preserve the difference between offered and earned work-study."
 ],
 "id": "7b6d8f02-001c-4c69-a638-b4502e9d3a17"
},
{
 "category": "education",
 "locality": "Warwick",
 "state": "RI",
 "region": "Northeast",
 "distinctFocus": "Student research-question formation",
 "title": "Create a Warwick teen research worksheet that turns a broad topic into a testable question",
 "benefit": "Students and volunteer tutors need a reusable way to narrow a school research topic and record why a source is useful.",
 "scope": "Use Warwick Public Library's learning resources to design three original topic-to-question examples, a six-field source-note template and a worked sample on a neutral local-interest topic. Identify which library follow-up resources need a card or internet connection.",
 "sources": [
  [
   "https://warwicklibrary.org/learning-parenting-resources",
   "Learning resources and linked student research tools"
  ],
  [
   "https://warwicklibrary.org/tutoring-policy",
   "Context for volunteer tutoring sessions"
  ]
 ],
 "first": "Draft one broad topic, narrower question and source note showing the difference between evidence and opinion.",
 "output": "A printable research-planning worksheet with three examples and a source-use rubric.",
 "criteria": [
  "Do not present invented sample findings as facts about Warwick.",
  "Create original exercises; resource access requirements must be checked rather than assumed."
 ],
 "id": "7b6d8f02-001d-4c69-a638-b4502e9d3a17"
},
{
 "category": "education",
 "locality": "Lexington",
 "state": "KY",
 "region": "Southeast",
 "distinctFocus": "Audio storytelling lesson",
 "title": "Design a family audio-story lesson for Lexington's library learning spaces",
 "benefit": "Families can plan a short original story before using a library recording space.",
 "scope": "Use the library's learning-space descriptions to create a 20-minute planning lesson for a fictional two-minute audio story. Include six scene prompts, a spoken-word timing exercise, a transcript template and a checklist separating original material from music requiring permission.",
 "sources": [
  [
   "https://www.lexpublib.org/learning-spaces",
   "Digital studio purpose, participant access and learning context"
  ]
 ],
 "first": "Write a six-scene outline for an original fictional story and estimate its narration time transparently.",
 "output": "A storyboard, timing exercise, blank transcript template and facilitator notes.",
 "criteria": [
  "No real children's recordings, names or personal stories.",
  "Do not promise studio access or reproduce copyrighted music and scripts."
 ],
 "id": "7b6d8f02-001e-4c69-a638-b4502e9d3a17"
},
{
 "category": "civic-public-information",
 "locality": "Ames",
 "state": "IA",
 "region": "Plains",
 "distinctFocus": "Advisory board terms and volunteer commitments",
 "title": "Build an Ames advisory-board term and commitment tracker",
 "benefit": "Residents considering civic volunteering need to understand seat terms and meeting commitments before pursuing an appointment.",
 "scope": "Select three service-focused advisory boards from the city roster. Reconcile published term lengths, current term-end dates, meeting frequency and eligibility with appointment information; distinguish an expiring term from an announced vacancy.",
 "sources": [
  [
   "https://www.cityofames.org/My-Government/Departments/City-Clerk/City-Council-Meetings-Agendas-Minutes",
   "Appointment actions when needed to resolve term dates"
  ],
  [
   "https://www.cityofames.org/My-Government/Departments/City-Clerk/Boards-Commissions",
   "Official board responsibilities, membership terms and appointment information"
  ]
 ],
 "first": "Pin one board roster and establish whether a listed term end corresponds to an actual advertised opening.",
 "output": "A three-board term calendar and time-commitment worksheet with unresolved vacancies marked.",
 "criteria": [
  "Do not infer a vacancy from an expired web roster or contact any member.",
  "Use official role information only; no private contact details or political recommendations."
 ],
 "id": "7b6d8f02-001f-4c69-a638-b4502e9d3a17"
},
{
 "category": "civic-public-information",
 "locality": "Rock Hill",
 "state": "SC",
 "region": "Southeast",
 "distinctFocus": "Development hearing authority",
 "title": "Identify which Rock Hill board can decide three different development requests",
 "benefit": "Neighbors need to understand whether a public notice concerns rezoning, a variance or historic-design review.",
 "scope": "Select one notice each from the Planning Commission, Zoning Board of Appeals and Board of Historic Review. Identify the requested action, decision authority, next procedural step and official record location; explain terms without advocating for an outcome.",
 "sources": [
  [
   "https://www.cityofrockhill.com/departments/planning-and-development/development-plan-review/public-hearings-plan-info",
   "Three hearing bodies and published notices"
  ]
 ],
 "first": "Pin one notice and establish whether that body decides the request or recommends action elsewhere.",
 "output": "A three-case authority matrix and a short neutral notice-reading guide.",
 "criteria": [
  "Preserve the notice date and jurisdiction; no personalized legal advice.",
  "Do not infer approval, opposition or a final decision from a hearing announcement."
 ],
 "id": "7b6d8f02-0020-4c69-a638-b4502e9d3a17"
},
{
 "category": "civic-public-information",
 "locality": "Nashua",
 "state": "NH",
 "region": "Northeast",
 "distinctFocus": "Assessment versus tax-bill arithmetic",
 "title": "Explain Nashua revaluation without equating assessment growth with tax growth",
 "benefit": "Homeowners need a clear way to understand why a changed assessment alone cannot predict the next tax bill.",
 "scope": "Use the city's assessing and property-tax guidance to build two fictional examples showing assessed value, tax rate and levy relationships. Pin current definitions and separate a model calculation from any actual bill or appeal determination.",
 "sources": [
  [
   "https://www.nashuanh.gov/150/Assessing-Department",
   "Assessment function and revaluation guidance"
  ],
  [
   "https://www.nashuanh.gov/1564/Property-Tax-Assessments",
   "Assessment record definitions and linked tax information"
  ]
 ],
 "first": "Verify the tax-rate unit and create one labeled hypothetical value-times-rate calculation.",
 "output": "Two checked scenarios and an original assessment-versus-bill explainer with source dates.",
 "criteria": [
  "Use no homeowner records or individualized tax estimate.",
  "Do not assume the tax rate stays fixed after revaluation or advise on an appeal."
 ],
 "id": "7b6d8f02-0021-4c69-a638-b4502e9d3a17"
},
{
 "category": "civic-public-information",
 "locality": "Henderson",
 "state": "NV",
 "region": "Mountain West",
 "distinctFocus": "Utility bill units and charge components",
 "title": "Decode Henderson water-bill units with a transparent sample calculation",
 "benefit": "Households comparing bills need to separate consumption, fixed service charges and sewer charges.",
 "scope": "Follow Utility Services to the current published residential rate schedule and bill explanation. Reproduce one clearly hypothetical bill with all applicable published components and unit conversions; flag any component that cannot be reconstructed from public information.",
 "sources": [
  [
   "https://www.cityofhenderson.com/government/departments/utility-services",
   "Find public residential rates and bill definitions"
  ],
  [
   "https://www.cityofhenderson.com/residents/pay-for/water-bill",
   "Official utility-account route; do not sign in"
  ]
 ],
 "first": "Pin the rate schedule's effective date and identify the consumption unit and fixed monthly charge.",
 "output": "An annotated sample bill, calculation steps and a dated glossary of charge types.",
 "criteria": [
  "Never access an account or claim a real bill is incorrect.",
  "Use the current applicable schedule; no invented meter size, surcharge or discount."
 ],
 "id": "7b6d8f02-0022-4c69-a638-b4502e9d3a17"
},
{
 "category": "civic-public-information",
 "locality": "Beaverton",
 "state": "OR",
 "region": "Pacific",
 "distinctFocus": "Neighborhood versus city service routing",
 "title": "Clarify which Beaverton neighborhood issues go to a NAC or a city service desk",
 "benefit": "Residents need to distinguish a neighborhood discussion forum from the city department that can handle a service request.",
 "scope": "Use the NAC descriptions and linked city-service pages to route six hypothetical non-emergency issues such as park programming, a broken streetlight or a neighborhood event. Identify each body's actual authority and the public starting point.",
 "sources": [
  [
   "https://www.beavertonoregon.gov/your-neighborhood",
   "NAC remit, boundaries and official city links"
  ]
 ],
 "first": "Choose two contrasting issues and trace whether the NAC can decide, discuss or only refer each one.",
 "output": "A six-issue routing card with authority notes and verified public contact routes.",
 "criteria": [
  "No submissions or messages to residents or officials.",
  "Do not infer a department's responsibility from an organization's name alone."
 ],
 "id": "7b6d8f02-0023-4c69-a638-b4502e9d3a17"
},
{
 "category": "civic-public-information",
 "locality": "Franklin",
 "state": "TN",
 "region": "South Central",
 "distinctFocus": "Capital project cost versus financing",
 "title": "Separate Franklin project costs from financing and annual spending",
 "benefit": "Residents comparing capital-project announcements need to avoid adding a project total, bond authorization and yearly expenditure as three separate costs.",
 "scope": "Select two capital projects with public cost and funding records. Trace total authorized cost, funding source, fiscal-year allocation and spending-to-date only where published. Explain missing or non-comparable values rather than filling them.",
 "sources": [
  [
   "https://www.franklintn.gov/our-city/city-projects",
   "Capital project records"
  ],
  [
   "https://www.franklintn.gov/government/departments-a-j/invest-franklin",
   "Investment and financing descriptions"
  ]
 ],
 "first": "Pin one project's cost statement and identify whether it is a total estimate, appropriation or actual expenditure.",
 "output": "A two-project finance glossary table and one worked non-double-counting example.",
 "criteria": [
  "No inference of waste or overruns from mismatched accounting measures.",
  "Keep fiscal years, price dates and project scope changes attached to figures."
 ],
 "id": "7b6d8f02-0024-4c69-a638-b4502e9d3a17"
},
{
 "category": "open-data",
 "locality": "Gilbert",
 "state": "AZ",
 "region": "Mountain West",
 "distinctFocus": "Permit lifecycle data normalization",
 "title": "Separate Gilbert permit applications from issued and completed work",
 "benefit": "Residents following neighborhood construction need permit data that does not count an application as a finished home.",
 "scope": "Take a reproducible 20-record public sample from Gilbert's permit dataset. Preserve permit identifiers, type, application/issue/completion dates and status, and document one-to-many records and missing dates. Omit names and exact residential addresses from the output.",
 "sources": [
  [
   "https://data.gilbertaz.gov/datasets/TOG%3A%3Apermits/about",
   "Permit dataset, field definitions and export options"
  ]
 ],
 "first": "Inspect five rows and identify which fields actually distinguish applied, issued and completed records.",
 "output": "A 20-record minimized CSV excerpt, field dictionary and lifecycle counting rules.",
 "criteria": [
  "Do not equate permit counts with dwellings or completed construction.",
  "Keep identifiers as text and unknown dates empty; retain export date and query."
 ],
 "id": "7b6d8f02-0025-4c69-a638-b4502e9d3a17"
},
{
 "category": "open-data",
 "locality": "Fort Collins and northern Colorado",
 "state": "CO",
 "region": "Mountain West",
 "distinctFocus": "Bicycle counter coverage metadata",
 "title": "Document which northern Colorado bike counters support comparable counts",
 "benefit": "Commuter advocates need to know whether two count totals cover the same duration and distinguish bicycles from pedestrians.",
 "scope": "Select three northern Colorado stations from CDOT's non-motorized count resources, prioritizing Fort Collins when represented. Record station identifiers, mode separation, directional coverage, counting method and available periods; normalize one common day's data if supported.",
 "sources": [
  [
   "https://www.codot.gov/programs/bikeped/bicycle-pedestrian-counts",
   "Official non-motorized counter app and methods"
  ]
 ],
 "first": "Pin one station and establish whether its value is bicycles, pedestrians or a combined count.",
 "output": "A three-station metadata crosswalk, optional common-day extract and explicit non-comparability flags.",
 "criteria": [
  "Do not substitute vehicle traffic counts or estimate missing station coverage.",
  "Do not interpret count differences as safety outcomes or citywide mode share."
 ],
 "id": "7b6d8f02-0026-4c69-a638-b4502e9d3a17"
},
{
 "category": "open-data",
 "locality": "Cedar Rapids",
 "state": "IA",
 "region": "Plains",
 "distinctFocus": "Service-request status semantics",
 "title": "Make Cedar Rapids service-request categories and closure dates reusable",
 "benefit": "Neighborhood groups need to distinguish a closed administrative request from a physical repair completed on that date.",
 "scope": "Use the public My CR request map to inspect up to 20 visible records across three categories. Document available status and date fields, update cadence and export terms; normalize only fields supported by the public source, excluding personal text and precise household locations.",
 "sources": [
  [
   "https://www.cedar-rapids.org/mycr/",
   "Public citizen request map and update schedule"
  ],
  [
   "https://www.cedar-rapids.org/portal/instructions.php",
   "Workflow context; do not register or submit"
  ]
 ],
 "first": "Inspect two public records and determine whether the source defines closed as repaired.",
 "output": "A minimized sample, status dictionary and a note on valid versus invalid turnaround-time calculations.",
 "criteria": [
  "Do not claim an unavailable export exists or scrape authenticated records.",
  "Missing repair dates remain unknown; administrative closure is not evidence of repair."
 ],
 "id": "7b6d8f02-0027-4c69-a638-b4502e9d3a17"
},
{
 "category": "open-data",
 "locality": "Virginia Beach",
 "state": "VA",
 "region": "Southeast",
 "distinctFocus": "Stormwater network layer relationships",
 "title": "Connect Virginia Beach inlet and outfall data without inventing drainage links",
 "benefit": "Public-data users need to distinguish point locations from a documented drainage network before reusing local stormwater maps.",
 "scope": "Inspect the city's inlet and node/outfall dataset schemas. Build a small field crosswalk and test whether five public records expose usable relationship identifiers, coordinate reference and update dates. Report when connectivity cannot be established from these layers alone.",
 "sources": [
  [
   "https://data.virginiabeach.gov/datasets/afe27abefdaa469783575a7de543932d_1/about",
   "Stormwater inlet dataset"
  ],
  [
   "https://gis.data.vbgov.com/datasets/stormwater-node-outfall/about",
   "Node/outfall dataset"
  ]
 ],
 "first": "Compare identifier fields in both layers and verify whether any explicit relationship key exists.",
 "output": "A two-layer data dictionary, five-record test and a reproducible statement of connectivity limits.",
 "criteria": [
  "Proximity is not a pipe connection; never invent network topology.",
  "No flood predictions, critical-facility analysis or engineering instructions."
 ],
 "id": "7b6d8f02-0028-4c69-a638-b4502e9d3a17"
},
{
 "category": "open-data",
 "locality": "Dover",
 "state": "DE",
 "region": "Northeast",
 "distinctFocus": "GIS reuse permissions and map currency",
 "title": "Create a reuse record for Dover's public parcel-and-zoning map",
 "benefit": "Community researchers need to know which map layer, date and disclaimer support a published zoning reference.",
 "scope": "Inspect Dover's public GIS page and parcel/zoning viewer. Document layer ownership, coordinate system, update dates, available export formats and reuse terms for zoning and municipal boundaries. Produce a minimal metadata record without republishing parcel-owner information.",
 "sources": [
  [
   "https://www.cityofdover.gov/geographic-information-systems-gis",
   "Official GIS source and terms"
  ],
  [
   "https://www.arcgis.com/apps/webappviewer/index.html?id=206e28119cc946a4b44aa07ae2dfce7d",
   "City-linked parcel and zoning viewer"
  ]
 ],
 "first": "Identify the zoning layer's owner and any published data date, distinguishing it from the viewer's update date.",
 "output": "Two reusable metadata records and a citation template for non-authoritative map use.",
 "criteria": [
  "Public viewing does not automatically grant unrestricted redistribution.",
  "Do not infer property rights, current legal zoning or a surveyed boundary from the viewer."
 ],
 "id": "7b6d8f02-0029-4c69-a638-b4502e9d3a17"
},
{
 "category": "open-data",
 "locality": "Anchorage",
 "state": "AK",
 "region": "Pacific",
 "distinctFocus": "Snow maintenance layer joinability",
 "title": "Check whether Anchorage snow-priority data can be joined to street ownership",
 "benefit": "Residents analyzing winter maintenance need to separate a road's owner, plowing priority and reported plow status.",
 "scope": "Use the municipality's snow and maintenance maps to inspect three public layers. Document keys, update schedules, definitions and geometry; test a five-road sample using street names and public segment identifiers only.",
 "sources": [
  [
   "https://www.muni.org/Departments/operations/streets/Pages/SnowRemoval.aspx",
   "Snow-plowing and street-owner links"
  ],
  [
   "https://www.muni.org/Departments/operations/streets/pages/maps.aspx",
   "Street, sidewalk and trail maintenance maps"
  ]
 ],
 "first": "Pin the ownership and priority layers and check whether they share a documented segment identifier.",
 "output": "A three-layer join guide, five-road public sample and uncertainty flags for mismatched segments.",
 "criteria": [
  "Priority is not a promised service time; status is not a live safety guarantee.",
  "Do not infer a missed service from a stale or absent map update."
 ],
 "id": "7b6d8f02-002a-4c69-a638-b4502e9d3a17"
},
{
 "category": "consumer-protection",
 "locality": "Dayton-area households",
 "state": "OH",
 "region": "Midwest",
 "distinctFocus": "Insurance valuation and depreciation",
 "title": "Show Ohio homeowners how depreciation changes an insurance example",
 "benefit": "Homeowners reviewing coverage need to distinguish replacement cost, actual cash value, deductibles and delayed recoverable amounts.",
 "scope": "Use the Ohio homeowners guide and NAIC explanation to create two clearly fictional loss-settlement examples. Show arithmetic step by step and list policy details that prevent these examples from predicting a real claim.",
 "sources": [
  [
   "https://insurance.ohio.gov/consumers/homeowner/homeowners-insurance-guide",
   "Ohio guide and coverage definitions"
  ],
  [
   "https://content.naic.org/article/whats-difference-between-actual-cash-value-coverage-and-replacement-cost-coverage",
   "Regulator explanation of valuation terms"
  ]
 ],
 "first": "Draft one fictional example separating depreciation from the deductible and check the arithmetic.",
 "output": "Two worked coverage-literacy examples and an original policy-question worksheet.",
 "criteria": [
  "No actual claims advice, guaranteed payment or recommendation to buy coverage.",
  "Keep replacement of property, policy limits and insurer-specific conditions explicit."
 ],
 "id": "7b6d8f02-002b-4c69-a638-b4502e9d3a17"
},
{
 "category": "consumer-protection",
 "locality": "Raleigh-area motorists",
 "state": "NC",
 "region": "Southeast",
 "distinctFocus": "Auto repair authorization trail",
 "title": "Build a North Carolina auto-repair estimate and authorization checklist",
 "benefit": "Working households need a simple record of what repair was estimated, authorized and ultimately billed.",
 "scope": "Use current NC DOJ guidance and its linked legal references to design a blank estimate-to-invoice comparison sheet. Include two fictional examples: extra work proposed after diagnosis and a final charge differing from the estimate.",
 "sources": [
  [
   "https://ncdoj.gov/protecting-consumers/automobiles/auto-repair/",
   "Official estimate, authorization and consumer guidance"
  ]
 ],
 "first": "Pin current published thresholds and record which changes require documented authorization according to the source.",
 "output": "A blank comparison sheet, two labeled practice cases and official dispute-information links.",
 "criteria": [
  "Do not pronounce an actual shop's conduct unlawful or contact a business.",
  "Verify current thresholds and exceptions; do not provide personalized legal advice."
 ],
 "id": "7b6d8f02-002c-4c69-a638-b4502e9d3a17"
},
{
 "category": "consumer-protection",
 "locality": "Larimer County",
 "state": "CO",
 "region": "Mountain West",
 "distinctFocus": "Solar ownership and financing comparison",
 "title": "Make Larimer County solar quotes comparable across purchase, loan and lease",
 "benefit": "Homeowners need to distinguish system ownership, financing costs and assumed electricity savings when reviewing a solar proposal.",
 "scope": "Follow county solar resources to the residential consumer guide. Create a blank three-option comparison worksheet covering ownership, payment obligation, maintenance, transfer on sale, incentives and savings assumptions. Add one entirely fictional comparison without recommending a vendor.",
 "sources": [
  [
   "https://www.larimer.gov/building/solar-energy",
   "County resources and permitting context"
  ],
  [
   "https://seia.org/research-resources/residential-consumer-guide/",
   "Industry-authored consumer guide; identify its provenance"
  ]
 ],
 "first": "Check who owns the system in each structure and separate verified obligations from sales projections.",
 "output": "A reusable purchase/loan/lease worksheet, fictional example and source-provenance note.",
 "criteria": [
  "Do not assume incentive eligibility, utility approval or guaranteed savings.",
  "Identify industry-authored guidance and independently verify legal or incentive claims before repeating them."
 ],
 "id": "7b6d8f02-002d-4c69-a638-b4502e9d3a17"
},
{
 "category": "consumer-protection",
 "locality": "Spokane-area residents",
 "state": "WA",
 "region": "Pacific",
 "distinctFocus": "Gym membership cancellation evidence",
 "title": "Create a Washington gym-cancellation record checklist",
 "benefit": "Households need to preserve the right contract and notice information when ending an unwanted recurring membership.",
 "scope": "Use current Washington Attorney General health-club guidance and linked law to distinguish contract term, notice route, effective date, disability/move provisions if applicable and refund language. Create three fictional contract-reading examples, without drafting an actual cancellation for anyone.",
 "sources": [
  [
   "https://www.atg.wa.gov/health-clubs",
   "Health-club contract and cancellation guidance; follow current legal references"
  ]
 ],
 "first": "Pin the current rule and identify the contract attributes that change the published cancellation route.",
 "output": "A blank evidence checklist and three original examples with unresolved terms marked.",
 "criteria": [
  "Do not assume every fitness subscription falls under the same rule.",
  "No personal legal determination, provider accusation or submitted notice."
 ],
 "id": "7b6d8f02-002e-4c69-a638-b4502e9d3a17"
},
{
 "category": "consumer-protection",
 "locality": "Worcester-area renters",
 "state": "MA",
 "region": "Northeast",
 "distinctFocus": "Security-deposit document continuity",
 "title": "Organize Massachusetts rental-deposit records from move-in to return",
 "benefit": "Renting households need to retain a coherent record of a deposit rather than discovering missing documents when they move.",
 "scope": "Use Massachusetts deposit guidance and current legal-information references to create an original document timeline covering receipt, condition statement, interest, deductions and return. Add a fictional move-out example that distinguishes documented deductions from unresolved questions.",
 "sources": [
  [
   "https://www.mass.gov/security-deposits",
   "Official deposit process"
  ],
  [
   "https://www.mass.gov/info-details/massachusetts-law-about-tenants-security-deposits",
   "Current legal-information references"
  ],
  [
   "https://www.mass.gov/info-details/learn-about-returning-or-getting-back-a-security-deposit",
   "Return and deduction guidance"
  ]
 ],
 "first": "Identify two documents from different stages and verify the published timing and qualifications for each.",
 "output": "A blank deposit-document organizer, one fictional timeline and official help routes.",
 "criteria": [
  "No tenant names, addresses, financial records or individualized legal conclusions.",
  "Verify current deadlines and exceptions; do not guarantee recovery or penalties."
 ],
 "id": "7b6d8f02-002f-4c69-a638-b4502e9d3a17"
},
{
 "category": "consumer-protection",
 "locality": "Competitive-market Texas communities",
 "state": "TX",
 "region": "South Central",
 "distinctFocus": "Electricity plan usage sensitivity",
 "title": "Show Texas households why one advertised electricity rate is not enough",
 "benefit": "Households shopping in competitive electricity areas need to see how usage thresholds and fixed fees change a plan comparison.",
 "scope": "Use PUCT guidance to identify Electricity Facts Label components. Build two fully fictional plans with different fixed charges or usage credits and calculate bills at 500, 1,000 and 2,000 kWh, labeling assumed delivery charges and exclusions.",
 "sources": [
  [
   "https://www.puc.texas.gov/consumer-help/electricity/electric-plan/Default.aspx",
   "Official shopping and EFL guidance"
  ],
  [
   "https://www.powertochoose.org/",
   "Official comparison service; no enrollment or real-price claim"
  ]
 ],
 "first": "Define two hypothetical fee structures and check the total-cost arithmetic at 1,000 kWh.",
 "output": "A six-cell worked comparison and a reusable plan-reading worksheet.",
 "criteria": [
  "State that choice is not available in every Texas utility territory.",
  "No provider recommendation, live price assertion or estimated savings for a real household."
 ],
 "id": "7b6d8f02-0030-4c69-a638-b4502e9d3a17"
},
{
 "category": "infrastructure",
 "locality": "Madison",
 "state": "WI",
 "region": "Midwest",
 "distinctFocus": "Water supply zones versus household-specific quality",
 "title": "Explain Madison well-service information without assigning one well to every tap",
 "benefit": "Residents reading water reports need to understand distribution zones and the limits of a well-specific result.",
 "scope": "Compare the utility's well-service information, wellhead-protection guidance and annual report. Document how the utility describes supply areas and blending, then build a three-term crosswalk connecting source wells, service areas and compliance sampling.",
 "sources": [
  [
   "https://www.cityofmadison.com/water/waterquality/mywells.cfm",
   "Well-service explanation; no household address submission"
  ],
  [
   "https://www.cityofmadison.com/water/water-quality/wellhead-protection-program",
   "Source-protection scope"
  ],
  [
   "https://www.cityofmadison.com/water/water-quality/annual-drinking-water-quality-report",
   "System reporting and sampling context"
  ]
 ],
 "first": "Find the utility's own qualification on which wells serve an area and distinguish that from a tap-water test.",
 "output": "A source-to-distribution explanation and evidence table of what each report can establish.",
 "criteria": [
  "No medical or drinking-water safety determination.",
  "Do not expose household addresses or infer exact real-time flow paths."
 ],
 "id": "7b6d8f02-0031-4c69-a638-b4502e9d3a17"
},
{
 "category": "infrastructure",
 "locality": "Olathe",
 "state": "KS",
 "region": "Plains",
 "distinctFocus": "Pavement preservation treatments",
 "title": "Explain why Olathe uses different treatments on different streets",
 "benefit": "Residents need to understand the purpose of crack sealing, microsurfacing, overlays and reconstruction when comparing neighborhood work.",
 "scope": "Use the city pavement-preservation description and linked project information to explain four treatments, the published condition metric and any stated selection factors. Include one source-grounded example per treatment where available, marking gaps.",
 "sources": [
  [
   "https://www.olatheks.gov/government/public-works/streets-traffic",
   "Pavement condition and preservation methods"
  ],
  [
   "https://www.olatheks.gov/residents/road-closures-construction-projects",
   "Published project examples"
  ]
 ],
 "first": "Pin the condition metric definition and explain one preventive treatment's purpose in original wording.",
 "output": "A four-treatment reference table and a short condition-score explainer.",
 "criteria": [
  "Do not invent lifespan, cost or engineering selection thresholds.",
  "A high priority or condition score is not a promised work date."
 ],
 "id": "7b6d8f02-0032-4c69-a638-b4502e9d3a17"
},
{
 "category": "infrastructure",
 "locality": "Fort Collins",
 "state": "CO",
 "region": "Mountain West",
 "distinctFocus": "Outage map reporting thresholds",
 "title": "Document what the Fort Collins outage map leaves out",
 "benefit": "Households need to understand why a momentary interruption or small outage may not appear in a public map.",
 "scope": "Extract the utility's published outage-map threshold, event definitions, update qualifications and reporting route. Construct four fictional cases distinguishing momentary interruption, small outage, estimated restoration and confirmed restoration.",
 "sources": [
  [
   "https://www.fortcollins.gov/Services/Utilities/Outages",
   "Map coverage, event definitions and utility reporting guidance"
  ]
 ],
 "first": "Verify the published minimum customer threshold and explain why a blank map does not prove service at an individual home.",
 "output": "A four-case map-reading guide and a dated statement of reporting limits.",
 "criteria": [
  "Do not create outage reports, identify infrastructure weak points or infer live service status.",
  "An estimated restoration time is not a promise or evidence that restoration occurred."
 ],
 "id": "7b6d8f02-0033-4c69-a638-b4502e9d3a17"
},
{
 "category": "infrastructure",
 "locality": "Vacaville",
 "state": "CA",
 "region": "Pacific",
 "distinctFocus": "Wastewater treatment versus drinking-water systems",
 "title": "Trace Vacaville wastewater stages without confusing them with drinking water",
 "benefit": "Residents reviewing utility investments need a clear account of collection, treatment and the destination of treated effluent.",
 "scope": "Use the Easterly treatment description and public utility reports to assemble an original six-stage process summary. Identify where the source discusses discharge or reuse, separate design capacity from actual flow and keep potable-water service outside the wastewater chain.",
 "sources": [
  [
   "https://www.cityofvacaville.gov/government/utilities/sewer/wastewater-treatment",
   "Easterly wastewater treatment process"
  ],
  [
   "https://www.cityofvacaville.gov/government/utilities/reports-and-plans",
   "Public plans and operating reports"
  ]
 ],
 "first": "Pin the report edition and identify the named influent source and treated-effluent destination.",
 "output": "A six-stage text flow, source references and a capacity-versus-flow glossary.",
 "criteria": [
  "No operational settings, process modification advice or infrastructure vulnerability assessment.",
  "Do not claim treated wastewater is potable or reuse occurs unless explicitly documented."
 ],
 "id": "7b6d8f02-0034-4c69-a638-b4502e9d3a17"
},
{
 "category": "infrastructure",
 "locality": "Portsmouth",
 "state": "NH",
 "region": "Northeast",
 "distinctFocus": "Water sewer and drainage construction scope",
 "title": "Separate Portsmouth street-project water, sewer and drainage work",
 "benefit": "Residents affected by utility construction need to understand which underground service is changing and what a notice actually promises.",
 "scope": "Choose one current or recently completed Public Works project with at least two dated notices. Track water, sanitary sewer, storm drainage and surface restoration as separate workstreams, preserving stated dates and resident-facing service notices.",
 "sources": [
  [
   "https://www.portsmouthnh.gov/publicworks",
   "Construction project pages and dated public notices"
  ]
 ],
 "first": "Pin one project and identify which utility systems are explicitly included in its scope.",
 "output": "A two-notice change log and service-by-service project explainer.",
 "criteria": [
  "No invented outage windows, completion claims or household service assurances.",
  "Do not assume a street reconstruction replaces every buried utility."
 ],
 "id": "7b6d8f02-0035-4c69-a638-b4502e9d3a17"
},
{
 "category": "infrastructure",
 "locality": "Chattanooga",
 "state": "TN",
 "region": "South Central",
 "distinctFocus": "Voice-service backup power dependencies",
 "title": "Clarify EPB phone-backup limits during Chattanooga power outages",
 "benefit": "Households need to distinguish backup power for a phone service from backup power for routers, cordless handsets and internet access.",
 "scope": "Compare EPB Fi Phone battery disclosures with the separately described Hosted Phone offering. Record product scope, published duration qualifications, customer-device dependencies and what is not powered; make no recommendation to modify electrical equipment.",
 "sources": [
  [
   "https://epb.com/fi-phone/backup-battery-disclaimers/",
   "Residential Fi Phone backup-power scope"
  ],
  [
   "https://epb.com/support/faq/l9Nql5l49YHXdnrODEPnurjVwJjEp0fjOYoL3Xedtry0NkP8gVtL7bp4vnxa/",
   "Hosted Phone FAQ; keep product identity distinct"
  ]
 ],
 "first": "Identify which phone product each duration claim applies to and extract one limitation on powered equipment.",
 "output": "A product-scoped dependency table and a short household preparation question list.",
 "criteria": [
  "Do not transfer a business-service claim to a residential service.",
  "No emergency-call availability guarantee, wiring instructions or assertion that internet is backed up."
 ],
 "id": "7b6d8f02-0036-4c69-a638-b4502e9d3a17"
},
{
 "category": "humanitarian-public-interest-research",
 "locality": "Portland and southern Maine",
 "state": "ME",
 "region": "Northeast",
 "distinctFocus": "Paid caregiving leave process friction",
 "title": "Check Maine paid-caregiving leave instructions for working families",
 "benefit": "Working caregivers need to understand the sequence of employer notice, benefit application and job-protection conditions.",
 "scope": "Compare the Maine worker page, employee FAQ and preparation sheet for family-care leave. Identify inconsistent or omitted process details across these three formats, including phone access and the distinction between wage eligibility and job protection.",
 "sources": [
  [
   "https://www.maine.gov/paidleave/workers/",
   "Worker instructions, FAQ, preparation sheet and phone-application route"
  ]
 ],
 "first": "Check whether the worker page and FAQ state the same job-protection condition and document any qualification.",
 "output": "A three-document consistency audit and an original caregiver process outline with unresolved questions.",
 "criteria": [
  "No personal eligibility determination, application or medical-document collection.",
  "Keep paid benefits and job protection separate; do not promise approval or a payment date."
 ],
 "id": "7b6d8f02-0037-4c69-a638-b4502e9d3a17"
},
{
 "category": "humanitarian-public-interest-research",
 "locality": "Grand Rapids suburbs",
 "state": "MI",
 "region": "Midwest",
 "distinctFocus": "Nonstandard-hours childcare evidence",
 "title": "Check whether Grand Rapids-area childcare listings document working-parent hours",
 "benefit": "Parents with early, late or weekend shifts need to know what published childcare listings actually establish.",
 "scope": "Use Michigan's official quality-search route to inspect five licensed program listings in the Grand Rapids area. Record whether early, evening or weekend hours, ages served and update dates are explicitly published; report missing fields without rating providers or seeking availability.",
 "sources": [
  [
   "https://www.michigan.gov/mikidsmatter/programs/gsq",
   "State-endorsed childcare search and definitions"
  ],
  [
   "https://greatstarttoquality.org/finding-child-care-preschool/",
   "Provider search and public field meanings"
  ]
 ],
 "first": "Inspect one public listing and distinguish licensed capacity, published hours and current vacancies.",
 "output": "A five-listing field-coverage audit and a reusable hours-confirmation worksheet.",
 "criteria": [
  "Do not collect child or parent information or identify individual home-provider addresses.",
  "Published hours and licensed capacity do not guarantee an available place."
 ],
 "id": "7b6d8f02-0038-4c69-a638-b4502e9d3a17"
},
{
 "category": "humanitarian-public-interest-research",
 "locality": "Columbia and mid-Missouri",
 "state": "MO",
 "region": "Plains",
 "distinctFocus": "Kinship support independent of legal custody",
 "title": "Clarify Missouri kinship support for relatives caring for children",
 "benefit": "Working grandparents and relatives need to distinguish a navigation service from foster-care status or a court order.",
 "scope": "Compare ParentLink's Kin-4-Kid information with the current Missouri Kinship Navigator program. Map the categories of support offered, stated caregiver relationships, referral process and questions the sources leave to a professional.",
 "sources": [
  [
   "https://parentlink.missouri.edu/kin-4-kid-line/",
   "University-operated caregiver information service"
  ],
  [
   "https://www.mokin4kid.org/",
   "Current navigator scope and access information"
  ]
 ],
 "first": "Check whether a formal custody order is stated as a requirement for contacting the service, without inferring eligibility for other benefits.",
 "output": "A support-versus-legal-status reference map and a plain-language first-contact preparation note.",
 "criteria": [
  "No child names, family histories or custody advice.",
  "Do not equate a referral, program contact or kinship relationship with entitlement to a payment."
 ],
 "id": "7b6d8f02-0039-4c69-a638-b4502e9d3a17"
},
{
 "category": "humanitarian-public-interest-research",
 "locality": "Salt Lake County",
 "state": "UT",
 "region": "Mountain West",
 "distinctFocus": "Respite support and capacity uncertainty",
 "title": "Distinguish Salt Lake caregiver education from in-home respite assistance",
 "benefit": "Working adults caring for relatives need to plan time off without mistaking a training program for scheduled replacement care.",
 "scope": "Compare county caregiver support with the state program description. Separate education, consultation, support groups, in-home services, assessment and any funding limits. Make a dated service-type map using only public descriptions.",
 "sources": [
  [
   "https://www.saltlakecounty.gov/aging-adult-services/support/caregiver-support/",
   "County caregiver service and access information"
  ],
  [
   "https://daas.utah.gov/seniors/",
   "State caregiver support scope and limits"
  ]
 ],
 "first": "Identify which published service can provide actual care coverage and what prerequisite assessment is described.",
 "output": "A service-type map and an original planning worksheet with capacity and eligibility questions left open.",
 "criteria": [
  "No guarantee of hours, staffing, funding or personal eligibility.",
  "Do not contact providers or collect a caregiver's health or employment information."
 ],
 "id": "7b6d8f02-003a-4c69-a638-b4502e9d3a17"
},
{
 "category": "humanitarian-public-interest-research",
 "locality": "Beaverton area",
 "state": "OR",
 "region": "Pacific",
 "distinctFocus": "School closure and camp schedule mismatch",
 "title": "Find gaps between Beaverton school days off and published recreation camps",
 "benefit": "Working parents need to see where school closures and advertised day-camp coverage do not line up.",
 "scope": "Compare the adopted 2026–2027 district calendar with published THPRD school-day-off offerings for one fall or winter period. Record up to six closure dates, age ranges and start/end times; distinguish no published offering from proven lack of childcare.",
 "sources": [
  [
   "https://www.beaverton.k12.or.us/about-us/calendar",
   "Adopted district calendar; distinguish Pre-K schedules"
  ],
  [
   "https://www.thprd.org/activities/search-classes-and-camps",
   "Public camp listings and timing"
  ]
 ],
 "first": "Pin the school calendar edition and compare one non-school date with one matching camp listing.",
 "output": "A six-date coverage table and an explicit list of timing, age and availability gaps.",
 "criteria": [
  "Do not book places or claim that a listed camp has vacancies.",
  "A park-district boundary, school attendance area and school calendar may differ; preserve those limits."
 ],
 "id": "7b6d8f02-003b-4c69-a638-b4502e9d3a17"
},
{
 "category": "humanitarian-public-interest-research",
 "locality": "Omaha-area households",
 "state": "NE",
 "region": "Plains",
 "distinctFocus": "Household document recovery after disruption",
 "title": "Build a private document-recovery plan for Omaha storm-displaced households",
 "benefit": "Families displaced from a home need a plan for replacing essential records without posting those records online.",
 "scope": "Use FEMA's Emergency Financial First Aid Kit to classify six document categories by private backup, official replacement issuer and urgency. Trace three Nebraska replacement routes from official issuer pages; create an empty worksheet, not a collection of anyone's records.",
 "sources": [
  [
   "https://www.fema.gov/emergency-financial-first-aid-kit",
   "Document categories and preparedness guidance; follow relevant official replacement issuers"
  ]
 ],
 "first": "Choose one identity-document category and identify the official Nebraska replacement issuer without starting an application.",
 "output": "A six-category recovery worksheet, three verified issuer routes and a privacy-preserving storage note.",
 "criteria": [
  "Do not request, store or publish identity numbers, records, balances or credentials.",
  "Separate preparedness and document replacement from eligibility for disaster assistance."
 ],
 "id": "7b6d8f02-003c-4c69-a638-b4502e9d3a17"
},
{
 "category": "archival-historical-research",
 "locality": "Nashua",
 "state": "NH",
 "region": "Northeast",
 "distinctFocus": "Mill closure chronology and entity identity",
 "title": "Reconcile Nashua mill-history dates without merging different companies",
 "benefit": "Local history readers need a chronology that distinguishes a company closing, a mill stopping production and later reuse of its buildings.",
 "scope": "Compare the Nashua Manufacturing historic-district record with the library history and their cited sources. Trace up to four significant dates, preserving the exact company, building or activity attached to each; explain apparent conflicts without silently choosing a date.",
 "sources": [
  [
   "https://npgallery.nps.gov/GetAsset/1fe7e59e-461f-4262-8416-f907af71c671",
   "National Register historic-district narrative and source bibliography"
  ],
  [
   "https://www.nashualibrary.org/210/Our-History",
   "Library and manufacturing-company history"
  ]
 ],
 "first": "Locate one apparently conflicting date and establish the entity and event each source actually describes.",
 "output": "A four-event chronology, conflict notes and a precise list of primary records needed to resolve remaining uncertainty.",
 "criteria": [
  "Distinguish contemporary records from later historical summaries.",
  "Do not flatten corporate, production and building-use events into one closure date."
 ],
 "id": "7b6d8f02-003d-4c69-a638-b4502e9d3a17"
},
{
 "category": "archival-historical-research",
 "locality": "Ames",
 "state": "IA",
 "region": "Plains",
 "distinctFocus": "Historic municipal boundary change",
 "title": "Trace Ames boundary growth using three historical map editions",
 "benefit": "Neighborhood historians need to distinguish a city-boundary change from new street construction or a cartographer's omission.",
 "scope": "Use the local history museum's maps to select three dated maps with visible city limits. Describe changes along one named edge of Ames using map legends, dates and public landmarks. Produce text evidence rather than treating old cartography as a surveyed property record.",
 "sources": [
  [
   "https://ameshistory.org/content/maps-books",
   "Local collection of street, city-limit and county maps"
  ]
 ],
 "first": "Pin two map editions and locate a single boundary segment that can be compared with confidence.",
 "output": "A three-edition boundary-change table, legend notes and one original neighborhood-history paragraph.",
 "criteria": [
  "Do not use Sanborn sheet numbering as a substitute for municipal boundaries.",
  "No present-day ownership conclusions or geographic precision beyond the source maps."
 ],
 "id": "7b6d8f02-003e-4c69-a638-b4502e9d3a17"
},
{
 "category": "archival-historical-research",
 "locality": "Dayton",
 "state": "OH",
 "region": "Midwest",
 "distinctFocus": "Photograph date-range evidence",
 "title": "Narrow date ranges for three historic Dayton street photographs",
 "benefit": "Local archives and history readers benefit from separating catalog dates from dates inferred from visible historical evidence.",
 "scope": "Use Ohio History Connection's street-photograph inventory and digitized records linked through the University of Dayton guide. Select three public images with uncertain or broad dates. Record catalog metadata, visible dated features and corroborating public records, without identifying private people.",
 "sources": [
  [
   "https://aspace.ohiohistory.org/repositories/2/resources/33874/inventory",
   "Dayton street-photograph collection inventory"
  ],
  [
   "https://libguides.udayton.edu/c.php?g=1100205&p=8041678",
   "Institutional digital-archive access routes"
  ]
 ],
 "first": "Pin one image ID and separate its catalog date from one independently supported earliest or latest possible date.",
 "output": "Three date-evidence records with confidence limits and suggested catalog notes for later review.",
 "criteria": [
  "Do not invent a precise year or alter a catalog.",
  "Respect image rights and do not infer identities from faces."
 ],
 "id": "7b6d8f02-003f-4c69-a638-b4502e9d3a17"
},
{
 "category": "archival-historical-research",
 "locality": "Puget Sound and western Washington",
 "state": "WA",
 "region": "Pacific",
 "distinctFocus": "Historic transport mode transitions",
 "title": "Document a Washington ferry-to-road transport transition from historical photographs",
 "benefit": "Community historians need evidence for how a crossing changed rather than a set of loosely related old transport images.",
 "scope": "Use the University of Washington transportation collection to select one named public crossing with records of two transport modes or periods. Build a three-record sequence, checking captions and contemporaneous references for the transition; report if the collection cannot support a sequence.",
 "sources": [
  [
   "https://content.lib.washington.edu/transportationweb/index.html",
   "Institutional transportation photograph collection and item records"
  ]
 ],
 "first": "Identify one crossing and two catalog records that establish the same location across different periods.",
 "output": "A three-record evidence sequence and an original 200-word account distinguishing observed change from uncertain chronology.",
 "criteria": [
  "Do not combine similarly named crossings or treat photo upload dates as event dates.",
  "If no adequate sequence exists, document the search and remaining records needed."
 ],
 "id": "7b6d8f02-0040-4c69-a638-b4502e9d3a17"
},
{
 "category": "archival-historical-research",
 "locality": "High Point",
 "state": "NC",
 "region": "Southeast",
 "distinctFocus": "Historical public-service directory continuity",
 "title": "Trace High Point library listings across three city directories",
 "benefit": "Local historians need to follow public-service locations through changing names, street numbering and directory conventions.",
 "scope": "Select three available High Point directories from the 1930s–1950s. Extract the public library's name, printed location, section and any hours listed; compare publisher conventions and use public historical sources to distinguish a move from renumbering.",
 "sources": [
  [
   "https://www.digitalnc.org/blog/yearbooks-and-city-directories-from-high-point-now-online/",
   "Named digitized directory range and collection links"
  ],
  [
   "https://www.digitalnc.org/institutions/high-point-museum/",
   "Institutional collection and directory records"
  ]
 ],
 "first": "Pin one directory edition and page and extract the library entry without copying residential listings.",
 "output": "A three-edition service-history table, naming/numbering notes and a short source-limits paragraph.",
 "criteria": [
  "Use institutional entries only; do not republish household directories.",
  "Historical listings do not establish current service or prove equal access for every resident."
 ],
 "id": "7b6d8f02-0041-4c69-a638-b4502e9d3a17"
},
{
 "category": "archival-historical-research",
 "locality": "Anchorage",
 "state": "AK",
 "region": "Pacific",
 "distinctFocus": "Post-earthquake plan versus completed reconstruction",
 "title": "Distinguish Anchorage reconstruction plans from completed work after 1964",
 "benefit": "Residents studying local resilience need to know which historical images depict damage, proposals or finished rebuilding.",
 "scope": "Use Alaska's Digital Archives to select four public records concerning one civic building or streetscape affected by the 1964 earthquake. Classify each as damage documentation, proposal, work in progress or completed work only when its metadata supports that status.",
 "sources": [
  [
   "https://vilda.alaska.edu/",
   "University and partner archive records; search Anchorage 1964 reconstruction"
  ]
 ],
 "first": "Pin one record and identify the exact evidence for its date and reconstruction stage.",
 "output": "A four-record reconstruction timeline with catalog citations and unresolved stages.",
 "criteria": [
  "Do not infer present-day structural safety from historical images.",
  "A drawing or artist's rendering does not prove construction occurred."
 ],
 "id": "7b6d8f02-0042-4c69-a638-b4502e9d3a17"
},
{
 "category": "verification-and-fact-checking",
 "locality": "Salem",
 "state": "OR",
 "region": "Pacific",
 "distinctFocus": "Modeled tree benefits versus cash revenue",
 "title": "Verify what Salem's annual tree-benefit dollar figure represents",
 "benefit": "Residents discussing tree investment need to separate modeled environmental value from money received in a city budget.",
 "scope": "Trace the city's published annual tree-benefit figure to its underlying assessment. Identify model year, canopy scope, benefit categories, valuation assumptions and uncertainty; check whether the total can be reconstructed from the cited components.",
 "sources": [
  [
   "https://www.cityofsalem.net/community/natural-environment-climate/trees-and-plants/how-trees-benefit-our-community",
   "Published environmental-benefit figures"
  ],
  [
   "https://www.cityofsalem.net/community/natural-environment-climate/trees-and-plants/community-forestry-strategic-plan",
   "Assessment and methodology links"
  ]
 ],
 "first": "Pin the underlying assessment year and identify whether one dollar amount is modeled value, avoided cost or actual revenue.",
 "output": "A claim-to-method fact check, component reconciliation and a corrected reusable caption if needed.",
 "criteria": [
  "Do not label a modeled benefit false merely because it is not cash revenue.",
  "Keep assessment year and spatial scope attached to the total."
 ],
 "id": "7b6d8f02-0043-4c69-a638-b4502e9d3a17"
},
{
 "category": "verification-and-fact-checking",
 "locality": "Spokane",
 "state": "WA",
 "region": "Pacific",
 "distinctFocus": "Airport passenger denominators",
 "title": "Check Spokane airport growth claims against the right passenger measure",
 "benefit": "Local readers need to distinguish enplanements, total passengers, cargo and aircraft operations in airport growth stories.",
 "scope": "Use the airport's latest complete annual statistics and its comparison year. Select two actual published growth figures, reconstruct the percentage calculation and identify whether each counts boarding passengers, all passenger movements or operations.",
 "sources": [
  [
   "https://business.spokaneairports.net/passenger-data",
   "Official monthly and annual statistical reports"
  ]
 ],
 "first": "Pin a complete annual report and identify the denominator for one published passenger-growth figure.",
 "output": "A two-claim calculation audit and a plain-language measure glossary.",
 "criteria": [
  "Do not add arrivals and departures to a total that already includes both.",
  "Do not infer tourism growth or resident travel behavior from passenger totals alone."
 ],
 "id": "7b6d8f02-0044-4c69-a638-b4502e9d3a17"
},
{
 "category": "verification-and-fact-checking",
 "locality": "Salt Lake City",
 "state": "UT",
 "region": "Mountain West",
 "distinctFocus": "Waste diversion denominator",
 "title": "Reconstruct Salt Lake City's residential waste-diversion percentage",
 "benefit": "Residents evaluating collection services need to distinguish diversion from a reduction in total waste generation.",
 "scope": "Trace the residential diversion figure on the city's rate-information page to its reporting year and material totals. Recompute the percentage where source data permit, documenting which streams and customers are included.",
 "sources": [
  [
   "https://www.slc.gov/sustainability/rate-increase-information/",
   "Published collection totals, diversion claim and source context"
  ]
 ],
 "first": "Identify the reporting year, numerator and denominator implied by the published diversion percentage.",
 "output": "A reproducible calculation or a precisely documented missing-input finding, plus a reusable explanatory caption.",
 "criteria": [
  "Diversion is not automatically recycling, avoided consumption or net environmental benefit.",
  "Do not mix residential collection with commercial or citywide waste streams."
 ],
 "id": "7b6d8f02-0045-4c69-a638-b4502e9d3a17"
},
{
 "category": "verification-and-fact-checking",
 "locality": "Wisconsin households",
 "state": "WI",
 "region": "Midwest",
 "distinctFocus": "Electricity average-price sector mix",
 "title": "Check Wisconsin electricity-price comparisons for sector and period mismatches",
 "benefit": "Households reading energy-price claims need to know why an all-sector state average differs from a residential rate.",
 "scope": "Compare EIA's Wisconsin profile and price table for one common completed year. Reconcile annual versus monthly, residential versus all-sector and cents/kWh versus bill totals; select two actual displayed figures and explain the proper comparison.",
 "sources": [
  [
   "https://www.eia.gov/electricity/state/wisconsin/",
   "Annual state electricity profile"
  ],
  [
   "https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a",
   "Sector-specific average prices and period notes"
  ]
 ],
 "first": "Pin two figures and check their sector, date range, units and preliminary status before calculating a difference.",
 "output": "A two-figure comparability check and an original caption that retains the correct scope.",
 "criteria": [
  "Average realized revenue per kWh is not an offered household tariff.",
  "No personalized bill forecast or savings recommendation."
 ],
 "id": "7b6d8f02-0046-4c69-a638-b4502e9d3a17"
},
{
 "category": "verification-and-fact-checking",
 "locality": "New Jersey school communities",
 "state": "NJ",
 "region": "Northeast",
 "distinctFocus": "Graduation cohort comparability",
 "title": "Verify New Jersey graduation comparisons across four- and five-year cohorts",
 "benefit": "Parents need to compare graduation figures without treating different student cohorts or completion windows as the same measure.",
 "scope": "Use NJDOE's adjusted-cohort files and definitions to select two public district-level comparisons. Preserve cohort year, four-/five-year window, subgroup suppression and adjustments; reproduce only comparisons supported by matching definitions.",
 "sources": [
  [
   "https://www.nj.gov/education/spr/adddata/acgr.shtml",
   "Official cohort datasets"
  ],
  [
   "https://www.nj.gov/education/spr/resources/understanding_acgr.shtml",
   "Cohort definitions and limitations"
  ],
  [
   "https://www.nj.gov/education/sleds/faq/graduation/",
   "Current graduation reporting FAQ"
  ]
 ],
 "first": "Pin one district's cohort year and verify whether two displayed rates concern the same entering students.",
 "output": "A two-comparison fact check and a family-facing explanation of cohort windows.",
 "criteria": [
  "No student-level records or rankings based on suppressed small groups.",
  "Do not attribute a change to school quality without supporting research."
 ],
 "id": "7b6d8f02-0047-4c69-a638-b4502e9d3a17"
},
{
 "category": "verification-and-fact-checking",
 "locality": "Lincoln",
 "state": "NE",
 "region": "Plains",
 "distinctFocus": "Household income period and inflation basis",
 "title": "Check Lincoln household-income comparisons for inflation and survey-window errors",
 "benefit": "Residents discussing middle-income household finances need to distinguish an inflation-adjusted community median from take-home pay or one family's earnings.",
 "scope": "Compare two official ACS/QuickFacts household-income estimates for Lincoln with available period and dollar-year notes. Document overlapping survey windows, inflation basis and uncertainty, then determine whether a claimed percentage increase can be validly calculated.",
 "sources": [
  [
   "https://www.census.gov/quickfacts/fact/table/lincolncitynebraska/PST045225",
   "QuickFacts household income, survey period and dollar-year notes"
  ],
  [
   "https://data.census.gov/profile/Lincoln_city%2C_Nebraska?g=160XX00US3128000",
   "Official ACS profile and underlying tables"
  ]
 ],
 "first": "Pin one estimate's survey window and inflation basis before choosing a comparison estimate.",
 "output": "A two-estimate evidence table, comparability verdict and a corrected caption if a valid comparison is possible.",
 "criteria": [
  "A city median does not classify every resident or measure disposable income.",
  "Do not mix one-year and five-year estimates or overlapping periods without explaining the limits."
 ],
 "id": "7b6d8f02-0048-4c69-a638-b4502e9d3a17"
},
{
 "category": "useful-open-source-public-resource-work",
 "locality": "Johnson County",
 "state": "KS",
 "region": "Plains",
 "distinctFocus": "Reusable design-file preparation checklist",
 "title": "Create a file-preparation checklist for Johnson County library makers",
 "benefit": "Community makers need to prepare original vector designs before arriving at a shared library workspace.",
 "scope": "Read the library's laser-cutting and MakerSpace FAQ instructions. Draft a tool-neutral preflight worksheet covering units, dimensions, fonts, layers, attribution and file format, distinguishing documented library requirements from general preparation suggestions.",
 "sources": [
  [
   "https://www.jocolibrary.org/makerspace/laser-cutting-engraving/",
   "Published design preparation and equipment context"
  ],
  [
   "https://www.jocolibrary.org/faq/makerspace/",
   "Current file-format and preparation FAQ"
  ]
 ],
 "first": "Identify one supported format and two documented file-preparation requirements, preserving the relevant tool/version context.",
 "output": "An original reusable preflight checklist and one fictional design-metadata example.",
 "criteria": [
  "No machine settings, material-safety assurances or claims of a successful fabrication test.",
  "Do not copy vendor documentation or assume a file accepted by one tool works in another."
 ],
 "id": "7b6d8f02-0049-4c69-a638-b4502e9d3a17"
},
{
 "category": "useful-open-source-public-resource-work",
 "locality": "Ann Arbor",
 "state": "MI",
 "region": "Midwest",
 "distinctFocus": "Shared-tool loan packing record",
 "title": "Build a check-in and check-out worksheet for Ann Arbor library tool loans",
 "benefit": "Borrowers and volunteer groups need a reusable way to keep multi-part library tools complete without treating a reservation as guaranteed availability.",
 "scope": "Use AADL's unusual-items collection and booking guidance to choose one music tool and one measurement or hobby tool with published component information. Create an empty packing-and-condition checklist and two source-grounded example inventories.",
 "sources": [
  [
   "https://aadl.org/catalog/browse/unusual",
   "Public tool types and catalog records"
  ],
  [
   "https://aadl.org/bookatool",
   "Current booking process and qualifications"
  ]
 ],
 "first": "Pin one tool record and extract only explicitly listed components and included instructions.",
 "output": "A reusable return-preparation worksheet with two catalog-linked examples.",
 "criteria": [
  "No reservations, account access or collection of borrower details.",
  "Do not invent included accessories, damage liability or loan terms."
 ],
 "id": "7b6d8f02-004a-4c69-a638-b4502e9d3a17"
},
{
 "category": "useful-open-source-public-resource-work",
 "locality": "Rochester-area households",
 "state": "MN",
 "region": "Midwest",
 "distinctFocus": "Seasonal home-maintenance record template",
 "title": "Create an open seasonal home-maintenance record for Minnesota households",
 "benefit": "Homeowners need a simple history of inspections, manuals and professional follow-up that survives changes of contractor or occupant.",
 "scope": "Use University of Minnesota Extension home-maintenance guidance to design a blank four-season log. Separate observation, manufacturer guidance, service performed and unresolved issue; include six fictional entries that demonstrate useful documentation without teaching hazardous repair.",
 "sources": [
  [
   "https://extension.umn.edu/caring-your-home/home-maintenance-and-safety",
   "Extension maintenance and seasonal guidance"
  ]
 ],
 "first": "Design the log fields and write one fictional entry that distinguishes an observed symptom from a diagnosed defect.",
 "output": "An original printable maintenance log, six fictional examples and source-linked reference headings.",
 "criteria": [
  "No electrical, gas, roof-access or structural repair instructions.",
  "No home addresses or claim that the template certifies safety or compliance."
 ],
 "id": "7b6d8f02-004b-4c69-a638-b4502e9d3a17"
},
{
 "category": "useful-open-source-public-resource-work",
 "locality": "Salem",
 "state": "OR",
 "region": "Pacific",
 "distinctFocus": "Transit dataset attribution and refresh documentation",
 "title": "Draft a source-and-refresh README for Cherriots public transit data",
 "benefit": "Volunteer developers building local travel resources need to cite the right feed and know when their timetable copy becomes stale.",
 "scope": "Use Cherriots' official data page to document current feed URLs, static versus real-time scope, attribution or reuse terms, validity fields and a safe manual refresh procedure. Prepare a standalone README; inspect data only and do not run downloaded software or publish to an external project.",
 "sources": [
  [
   "https://www.cherriots.org/data/",
   "Official feed links, formats and reuse information"
  ]
 ],
 "first": "Pin the static feed URL and any stated reuse terms, distinguishing an absent license statement from permission.",
 "output": "An original reusable README and a dated source manifest for a community transit-data project.",
 "criteria": [
  "Do not claim the feed was validated unless the stated checks were performed.",
  "No live-arrival guarantee, external repository edits or fabricated upstream acceptance."
 ],
 "id": "7b6d8f02-004c-4c69-a638-b4502e9d3a17"
},
{
 "category": "useful-open-source-public-resource-work",
 "locality": "Columbia and Richland County",
 "state": "SC",
 "region": "Southeast",
 "distinctFocus": "Seed-packet provenance label",
 "title": "Design an open seed-packet label for Richland community seed sharing",
 "benefit": "Garden clubs and seed-library volunteers need labels that preserve variety and provenance without inventing germination or disease-free claims.",
 "scope": "Use Richland Library's seed program to design an original blank label and inventory sheet covering plant/variety, source, harvest or packet year, treatment if known, storage note and uncertainty. Include three fictional examples for purchased, saved and unknown-origin seed.",
 "sources": [
  [
   "https://www.richlandlibrary.com/SeedLibrary",
   "Library seed program and its published participation context"
  ]
 ],
 "first": "Define fields that keep variety, year and unknown provenance distinct; draft one fictional label.",
 "output": "A reusable label, inventory sheet and three clearly hypothetical examples.",
 "criteria": [
  "Do not recommend planting restricted species or claim seed purity, viability or safety.",
  "Do not imply the library requires or endorses this proposed template."
 ],
 "id": "7b6d8f02-004d-4c69-a638-b4502e9d3a17"
},
{
 "category": "useful-open-source-public-resource-work",
 "locality": "Denver-area families",
 "state": "CO",
 "region": "Mountain West",
 "distinctFocus": "Family digital-archive preservation manifest",
 "title": "Create a public template for keeping family photo scans organized",
 "benefit": "Families digitizing photographs need a portable record of filenames, originals, dates, rights and backup checks.",
 "scope": "Locate Denver Public Library's home-archive preservation resources. Create a plain-text/CSV manifest template and a nontechnical workflow for preserving originals, working copies and uncertain dates, with five fictional records and a restore-check log.",
 "sources": [
  [
   "https://history.denverlibrary.org/",
   "Locate Resources for Preserving Your Archives at Home and linked preservation guidance"
  ]
 ],
 "first": "Pin a library preservation guide and draft fields that distinguish an original capture date from a later scan date.",
 "output": "An original manifest template, five fictional records and a concise backup/restore documentation guide.",
 "criteria": [
  "No upload of real family images, names or private history.",
  "Do not claim a backup exists or files pass integrity checks when no such check occurred."
 ],
 "id": "7b6d8f02-004e-4c69-a638-b4502e9d3a17"
},
];
