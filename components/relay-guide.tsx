/** One original character, with fixed-size crops and a display-only task signal. */
export function Relay({variant='avatar',size=56,carrying=false,animated=false,alt=''}:{variant?:'icon'|'avatar'|'full';size?:number;carrying?:boolean;animated?:boolean;alt?:string}){
 return <span className={`relay-guide relay-${variant}${carrying?' relay-carrying':''}${animated?' relay-animated':''}`} style={{width:size,height:size}}>
  <img src={variant==='icon'?'/brand/relay-mark-160.59869f96598d.webp':'/brand/relay-small.webp'} width={size} height={size} alt={alt} loading="lazy" decoding="async"/>
  {carrying&&<span className="relay-packet" aria-hidden="true"><span/></span>}
 </span>;
}
export function RelayCue({children,carrying=false}:{children:React.ReactNode;carrying?:boolean}){return <div className="relay-cue"><Relay carrying={carrying}/><div>{children}</div></div>}
