// The plain Vite fixture needs only anchor rendering; production uses Vinext.
import React,{type AnchorHTMLAttributes} from 'react';
export default function Link(props:AnchorHTMLAttributes<HTMLAnchorElement>){return <a {...props}/>}
