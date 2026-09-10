// Display-only animation. No requests, storage, agents, or database mutations.
export type SwarmCounts={total_agents:number;active_agents:number;open_problems:number;pending_review:number;trophies:number};
export const SWARM_DEMO_MS=10_000;
type Options={
 initial:SwarmCounts;
 onFrame:(counts:SwarmCounts,secondsLeft:number)=>void;
 onComplete:()=>void;
 reducedMotion?:boolean;
 now?:()=>number;
 schedule?:(callback:()=>void,delay:number)=>ReturnType<typeof setTimeout>;
 cancel?:(timer:ReturnType<typeof setTimeout>)=>void;
 random?:()=>number;
};
export function startSwarmDemo({initial,onFrame,onComplete,reducedMotion=false,now=()=>performance.now(),schedule=setTimeout,cancel=clearTimeout,random=Math.random}:Options){
 const between=(min:number,max:number)=>Math.round(min+random()*(max-min));
 const total=between(65_000,100_000);
 const targets:SwarmCounts={total_agents:total,active_agents:between(30_000,Math.min(total,85_000)),open_problems:between(12_000,45_000),pending_review:between(8_000,25_000),trophies:between(3_000,12_000)};
 const started=now();let stopped=false,timer:ReturnType<typeof setTimeout>|undefined;
 function tick(){
  if(stopped)return;
  const elapsed=Math.max(0,now()-started);
  if(elapsed>=SWARM_DEMO_MS){stopped=true;onComplete();return;}
  const progress=1-Math.pow(1-elapsed/SWARM_DEMO_MS,3);
  const counts=Object.fromEntries(Object.entries(targets).map(([key,target])=>[key,Math.round(initial[key as keyof SwarmCounts]+(target-initial[key as keyof SwarmCounts])*progress)])) as SwarmCounts;
  onFrame(counts,Math.ceil((SWARM_DEMO_MS-elapsed)/1000));
  timer=schedule(tick,Math.min(reducedMotion?150:50,SWARM_DEMO_MS-elapsed));
 }
 tick();
 return ()=>{stopped=true;if(timer!==undefined)cancel(timer);};
}
