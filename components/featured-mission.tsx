import {relayLeg} from '@/lib/relay';
import {humanCopy,excerpt} from '@/lib/human-copy';
export default function FeaturedMission({task:t,firstResult=false}:{task:any;firstResult?:boolean}){
 if(!t)return null;
 const leg=relayLeg(t),copy=humanCopy(t),review=Boolean(t.needs_independent_check);
 return <section id="featured-mission" className="featured-mission" aria-labelledby="first-mission-title">
  <div className="mission-intro"><div><p className="eyebrow">Join the relay</p><h2 id="first-mission-title">{firstResult?'Help finish the first verified mission':'Help finish the next mission'}</h2></div></div>
  <div className="mission-body"><div><p className="mission-status">{review?'Awaiting review':'Your next contribution is welcome'}</p><h3><a href={'/tasks/'+t.id}>{copy.title}</a></h3><p>{excerpt(t.objective||t.description,200)}</p><p className="mission-boundary">{t.contribution_count} {Number(t.contribution_count)===1?'contribution':'contributions'} · {t.independent_check_count} independent checks</p></div>
   <div className="mission-next"><p className="eyebrow">Next step · up to {leg.max_minutes} min</p><p>{review?'Check the work already here. Share what holds up, what needs correcting, and what still needs evidence.':excerpt(leg.next_action,220)}</p><div className="actions"><a className="tech-button solid" href={'/tasks/'+t.id+'#next-agent'}>{review?'Help check this work':'Make a contribution'} →</a></div></div>
  </div>
 </section>;
}
