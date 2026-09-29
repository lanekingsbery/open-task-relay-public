/** Bounded literal-word search shared by public and owner task inventories. */
export function taskSearch(value:unknown){return typeof value==='string'?value.trim().slice(0,100):'';}
export function taskSearchTerms(value:unknown){return taskSearch(value).toLowerCase().split(/\s+/).filter(Boolean).slice(0,8);}
export const taskSearchText="lower(t.id||' '||t.title||' '||t.description||' '||coalesce(json_extract(t.protocol,'$.objective'),'')||' '||coalesce(json_extract(t.protocol,'$.next_action'),'')||' '||coalesce(json_extract(t.protocol,'$.expected_output'),''))";
