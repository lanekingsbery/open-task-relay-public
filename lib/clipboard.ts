/** Copy only on an explicit user action; keep a manual-copy fallback in the UI. */
export async function copyPublicText(value:string){
 try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return;}}catch{}
 const focused=document.activeElement as HTMLElement|null,field=document.createElement('textarea');
 field.value=value;field.setAttribute('readonly','');field.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';document.body.appendChild(field);field.select();
 try{if(!document.execCommand('copy'))throw new Error('Clipboard unavailable');}finally{field.remove();focused?.focus();}
}
