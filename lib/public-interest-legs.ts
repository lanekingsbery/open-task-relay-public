// Owner-requested work outside this site's operations. Sources were opened and
// checked on 2026-09-08; mutable references must be rechecked by contributors.
const sources = {
 noaa:{url:'https://www.ncei.noaa.gov/pub/data/ghcn/daily/readme.txt',checked_at:'2026-09-08T22:33:58.635Z',schema_version:'3.34',record_range:'Section III: .dly format, VALUE, MFLAG, QFLAG and SFLAG'},
 gtfs:{url:'https://gtfs.org/documentation/schedule/reference/',checked_at:'2026-09-08T22:33:58.340Z',record_range:'Field Types (Time), stop_times.txt and stops.txt'},
 usgs:{url:'https://earthquake.usgs.gov/data/comcat/',checked_at:'2026-09-08T22:33:59.590Z',record_range:'Event terms: id, ids, time and updated'},
 tables:{url:'https://www.w3.org/WAI/tutorials/tables/two-headers/',checked_at:'2026-09-08T22:33:58.785Z',record_range:'Overview and table with header cells in the top row and first column'},
 census:{url:'https://www.census.gov/programs-surveys/acs/guidance/comparing-acs-data.html',checked_at:'2026-09-08T22:33:59.364Z',record_range:'Comparing ACS 5-year estimates and margins of error'},
 cone:{url:'https://www.nhc.noaa.gov/aboutcone.shtml',checked_at:'2026-09-08T22:33:58.738Z',record_range:'Definition of the NHC track forecast cone; identify the product and year described'},
 biodiversity:{url:'https://dwc.tdwg.org/terms/',checked_at:'2026-09-08T22:33:59.597Z',record_range:'occurrenceStatus and individualCount definitions and recommended vocabulary'},
};

type Brief={id:string;title:string;description:string;category:'open-data'|'accessibility'|'humanitarian-public-interest-research';minutes:number;sources:(keyof typeof sources)[];next_action:string;output:string;progress:string;criteria:string[]};
function leg({minutes,sources:keys,output,progress,criteria,...brief}:Brief){
 const refs=keys.map(key=>sources[key]);
 return {
  ...brief,objective:brief.description,difficulty:'easy',estimated_minutes:minutes,relay_leg_minutes:minutes,
  required_capabilities:[brief.category,'source-verification'],
  inputs:refs.map(ref=>({description:ref.record_range,url:ref.url})),
  next_action_sources:refs.map(ref=>ref.url),
  source_expectations:refs.map(ref=>({...ref,discovery_remaining:'The referenced public documentation returned HTTP 200 at the recorded check. Recheck the named section and record your retrieval date; no account, API key, bulk download or live-event query is required.'})),
  next_action_kind:'contribution',next_action_output:output,next_action_progress:progress,
  allowed_tools:['local_reasoning','local_text_processing','public_https_read'],risk_level:'low',external_side_effects_allowed:false,
  expected_output:output+' Include evidence URLs, retrieval date, limitations and one useful next check. Maximum 8,000 characters.',
  acceptance_criteria:[...criteria,'Use original work, cite the exact source sections and retrieval date, and state what was and was not checked. An eligible reviewer must check the deliverable before acceptance.'],
  validation_method:'independent_review',license:'CC-BY-4.0',attribution:'Credit the producing agent. Underlying source material retains its own rights.',
  output_format:'text',required_output_keys:[]
 };
}

export const publicInterestLegs = [
 leg({
  id:'dba4c460-d0ef-4a08-88f0-b673002acf72',title:'Keep rainfall flags intact in five reusable data examples',category:'open-data',minutes:10,sources:['noaa'],
  description:'Climate-data users need test examples that do not silently turn missing rainfall into a measured zero. Build five tiny synthetic GHCN-Daily precipitation cases from the official format reference. This leg produces reusable expected-output examples, not an analysis of climate trends or real station observations.',
  next_action:'Read section III of the NOAA README. Make five synthetic VALUE/MFLAG/QFLAG/SFLAG cases: valid zero, missing value, trace measurement, presumed-zero measurement and a failed quality check. Give the expected interpreted value and preserved flags for each. Work on one case if the time budget is short.',
  output:'A compact five-row fixture table with raw field values, interpreted precipitation and retained flags; a brief explanation of a data-cleaning mistake each case catches.',
  progress:'One correctly sourced fixture with its expected interpretation is useful partial progress.',
  criteria:['Distinguish a measured zero, missing data and trace/presumed-zero qualifications; do not assign an exact positive amount to a trace.','Keep measurement, quality and source flags separate. Include one nonblank QFLAG and explain its documented meaning.','Label every record as synthetic and disclose whether any parser was actually executed.']
 }),
 leg({
  id:'25e80cf9-ff7e-493c-b129-0a59d4e468c3',title:'Explain a bus trip scheduled after 24:00',category:'open-data',minutes:5,sources:['gtfs'],
  description:'Transit timetables can place an after-midnight trip on the previous service day. Create a small example that helps a timetable reader or data importer keep the service date and calendar date distinct. Use only the official GTFS reference and synthetic times.',
  next_action:'Check the GTFS Time field type and stop_times.txt arrival_time/departure_time rules. Explain a synthetic service day with times 23:50:00, 24:15:00 and 25:05:00. Identify the relevant timezone rule and keep daylight-saving transitions outside this example.',
  output:'Three service-time/calendar-day mappings and a short explanation of why taking the hour modulo 24 loses information.',
  progress:'One correct next-day mapping plus its source is a useful leg.',
  criteria:['Preserve the service date while showing the day offset and local clock time for each example.','State the GTFS timezone rule and the no-daylight-saving-transition assumption; do not present a UTC conversion without the required date and zone.','Do not classify a documented time greater than 24:00:00 as invalid solely because it exceeds an ordinary clock day.']
 }),
 leg({
  id:'18814cbe-7bf1-4653-8cb5-9ff5a99ac763',title:'Build six wheelchair-accessibility inheritance examples',category:'accessibility',minutes:10,sources:['gtfs'],
  description:'A transit app can give a misleading accessibility answer if it ignores a station value or treats missing information as a barrier. Turn the official GTFS wheelchair_boarding rules into six reusable synthetic parent/child examples. This is a data interpretation exercise, not a certification of any real journey.',
  next_action:'Read wheelchair_boarding and parent_station in stops.txt. Make six cases: parentless blank; child blank with parent 1; child 0 with parent 2; child blank with parent blank; child 1 with parent 2; child 2 with parent 1. Explain each result using the exact stop/platform semantics.',
  output:'Six rows showing child value, parent value, inherited or explicit meaning, and the source rule.',
  progress:'One verified inheritance case is useful partial progress.',
  criteria:['Treat blank/0 correctly for parentless stops and child stops, retaining unknown information where appropriate.','Apply explicit child values separately from parent fallback and preserve the distinction between vehicle boarding and a path to a platform.','Label the cases synthetic and avoid claiming a real stop, vehicle or complete journey is accessible.']
 }),
 leg({
  id:'e2725b01-50b2-4a19-a96b-3e8114bfe7fc',title:'Avoid counting one earthquake twice after a record update',category:'open-data',minutes:10,sources:['usgs'],
  description:'Public earthquake counts can be inflated when a record update is treated as a new event. Propose a small, documented matching rule using USGS event identifiers and aliases. Inspect the reference only; do not monitor live earthquakes or infer a forecast.',
  next_action:'Read the ComCat id, ids and updated definitions. Create two synthetic versions of one event with an overlapping alias and a third unrelated event. Explain how to recognize the update and what to do when aliases are missing or contradictory.',
  output:'Three tiny synthetic records, a proposed matching rule or pseudocode, and an unresolved-case policy.',
  progress:'Identify one documented identifier limitation and one matching example.',
  criteria:['Account for the documented possibility that the preferred id changes; do not claim it is permanently stable.','Distinguish record freshness from event identity and do not merge unrelated events merely because times or coordinates are close.','Keep uncertain matches unresolved rather than silently merging them; disclose that this is a proposed rule without a live-catalog validation.']
 }),
 leg({
  id:'7229a6f2-83a6-49f1-aabe-fe9f19cbe291',title:'Choose a defensible comparison between Census estimate periods',category:'humanitarian-public-interest-research',minutes:5,sources:['census'],
  description:'Community reports can imply a change by comparing overlapping American Community Survey five-year estimates. Write a short, reusable comparison note grounded in Census guidance. This leg checks study periods and uncertainty, not current statistics for a real community.',
  next_action:'Read the Census guidance on comparing ACS five-year datasets and margins of error. Assess the period pairs 2015–2019 versus 2020–2024, and 2019–2023 versus 2020–2024. Explain what additional checks would still be needed before claiming a meaningful change.',
  output:'A two-row period-comparison table and a 100–180 word explanation for a community data report.',
  progress:'One correctly assessed period pair with a source is useful partial progress.',
  criteria:['Correctly identify overlap and follow the official guidance without confusing release year with the full estimate period.','Explain that compatible periods alone do not establish statistical significance; mention margins of error, comparable geography and measures.','Do not invent estimates or claim that any real population changed.']
 }),
 leg({
  id:'0bc35b88-85d3-4320-822b-ec71674250f5',title:'Write a precise caption for a hurricane forecast cone',category:'humanitarian-public-interest-research',minutes:5,sources:['cone'],
  description:'A forecast-cone image can be misunderstood as the size of a hurricane or a boundary of certain outcomes. Draft a short educational caption tied to the National Hurricane Center definition. This is a reference-document task, not an interpretation of a live storm or emergency advice.',
  next_action:'Read the NHC definition of its track forecast cone. Draft a 60–100 word caption explaining what the cone describes and what the historical-error construction does not promise. Record the product and year on the page rather than assuming every experimental cone uses the same method.',
  output:'One original 60–100 word caption plus a source note identifying the documented product, year and limits.',
  progress:'One precise distinction between the forecast center track and storm size is useful partial progress.',
  criteria:['Describe the cone as a track-of-the-center product and distinguish it from a map of storm size or all effects.','Characterize the historical-error construction accurately; do not turn it into certainty for an individual storm or location.','Identify the version/year read, avoid extending its method to other products, and give no real-time safety or evacuation advice.']
 }),
 leg({
  id:'50853fd2-3596-4063-9ac4-52876b8e28a3',title:'Make a small community-data table understandable without visual layout',category:'accessibility',minutes:10,sources:['tables'],
  description:'A table of community program participation should remain understandable when read without its visual layout. Create an original HTML example with row and column headers using the W3C WAI tutorial. The example is a standalone public resource; no existing website needs to be accessed or edited.',
  next_action:'Use this synthetic table: columns Program, Morning, Afternoon; rows Art club, 8, 12 and Garden club, 5, 9. Add a descriptive caption and explicit row/column header relationships. Explain which two headers identify the cell containing 9. Read the reference but do not modify any outside site.',
  output:'A minimal original HTML table and a short explanation of the header associations and any untested assistive-technology behavior.',
  progress:'Correctly explain the two headers for one data cell, with a source.',
  criteria:['Preserve all supplied synthetic values and use appropriate table, caption, th and td markup.','Use scope=row and scope=col for this simple two-header structure, and identify the header pair for 9 correctly.','Distinguish a markup review from a completed screen-reader test; do not claim a test that was not performed.']
 }),
 leg({
  id:'4aa1dc36-b82a-4c7d-9f3a-57cee67dcac4',title:'Separate wildlife non-detection from a missing count',category:'open-data',minutes:10,sources:['biodiversity'],
  description:'Biodiversity records can blur a missing count with a recorded non-detection. Make a small interpretation guide using the current Darwin Core occurrenceStatus and individualCount definitions. Use synthetic examples only; no species locations, observer identities or bulk records are needed.',
  next_action:'Read occurrenceStatus and individualCount in the Darwin Core quick reference. Record the currently recommended occurrenceStatus terms exactly. Compare a detected record with an unspecified count, a record reporting non-detection, and a record where both fields are blank. State what each record can and cannot establish.',
  output:'A three-row synthetic interpretation table, the observed recommended vocabulary, and one caution about inferring absence from missing information.',
  progress:'One correctly sourced distinction between status and count is useful partial progress.',
  criteria:['Use the vocabulary actually present in the cited reference rather than assuming older terminology is current.','Distinguish an unspecified count, an explicit status and missing fields; do not silently convert a blank count into zero.','Limit conclusions to the recorded event; do not infer broad geographic absence or sampling completeness from these fields alone.']
 })
];
