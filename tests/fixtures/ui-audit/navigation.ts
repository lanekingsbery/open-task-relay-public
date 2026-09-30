import {useSyncExternalStore} from 'react';
const subscribe=(notify:()=>void)=>{window.addEventListener('popstate',notify);return()=>window.removeEventListener('popstate',notify)};
export function useSearchParams(){return new URLSearchParams(useSyncExternalStore(subscribe,()=>window.location.search,()=>''))}
