import React from 'react';
import {Video, useCurrentFrame, useVideoConfig, interpolate, Easing} from '@open-motion/core';

type Scene = {file:string; start:number; duration:number; line:string; reveal?:boolean};

const scenes: Scene[] = [
  {file:'clip-01.mp4',start:0,duration:45,line:'POV : tu comprends l’anglais.'},
  {file:'clip-02.mp4',start:45,duration:42,line:'Mais dès qu’on te parle…'},
  {file:'clip-03.mp4',start:87,duration:42,line:'Ton cerveau : plus rien.'},
  {file:'clip-04.mp4',start:129,duration:42,line:'Tu connais pourtant les mots.'},
  {file:'clip-05.mp4',start:171,duration:45,line:'Tu les apprends depuis des mois.'},
  {file:'clip-06.mp4',start:216,duration:54,line:'Mais tu ne les utilises jamais vraiment.'},
  {file:'clip-07.mp4',start:270,duration:60,line:'Alors j’ai changé une seule chose.'},
  {file:'clip-08.mp4',start:330,duration:60,line:'Je te montre → lien en bio',reveal:true},
];

const accent = '#A6FF00';
const white = '#FFFFFF';

function Caption({text, local, duration, reveal}:{text:string;local:number;duration:number;reveal?:boolean}){
  const words=text.split(' ');
  const progress=Math.max(0,Math.min(0.999,(local-2)/Math.max(1,duration-6)));
  const active=Math.min(words.length-1,Math.floor(progress*words.length));
  return <div style={{display:'flex',justifyContent:'center',flexWrap:'wrap',gap:'0 12px'}}>{words.map((word,i)=><span key={`${word}-${i}`} style={{color:i===active||reveal?accent:white,display:'inline-block',transform:`translateY(${i===active?-3:0}px)`}}>{word}</span>)}</div>;
}

export const SunamiTikTok:React.FC=()=>{
  const frame=useCurrentFrame();
  const {fps}=useVideoConfig();
  const scene=scenes.find(s=>frame>=s.start && frame<s.start+s.duration) || scenes[scenes.length-1];
  const local=frame-scene.start;
  const intro=interpolate(local,[0,8],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp',easing:Easing.outCubic});
  const outro=interpolate(local,[scene.duration-7,scene.duration],[1,0],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const opacity=Math.min(intro,outro);
  const zoom=1.03 + 0.035*(local/scene.duration);
  const y=interpolate(local,[0,scene.duration],[10,-8],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  const showBrand=scene.reveal && local>24;
  const brandOpacity=scene.reveal?interpolate(local,[24,34],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'}):0;

  return <div style={{position:'relative',width:'100%',height:'100%',overflow:'hidden',background:'#000',fontFamily:'Arial,Helvetica,sans-serif'}}>
    <Video src={`/clips/${scene.file}`} muted style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',transform:`scale(${zoom}) translateY(${y}px)`,opacity}} />
    <div style={{position:'absolute',inset:0,background:'linear-gradient(to bottom,rgba(0,0,0,.03) 28%,rgba(0,0,0,.78) 100%)'}} />
    <div style={{position:'absolute',left:58,right:58,bottom:330,opacity,transform:`translateY(${(1-intro)*24}px)`,fontSize:68,lineHeight:1.03,fontWeight:900,letterSpacing:-1.8,textAlign:'center',textShadow:'0 4px 16px rgba(0,0,0,.72)'}}>
      <Caption text={scene.line} local={local} duration={scene.duration} reveal={scene.reveal}/>
    </div>
    {showBrand && <div style={{position:'absolute',left:0,right:0,bottom:172,display:'flex',justifyContent:'center',opacity:brandOpacity}}>
      <div style={{padding:'13px 25px',borderRadius:999,background:'#090909',border:'2px solid rgba(166,255,0,.9)',color:accent,fontSize:38,fontWeight:900}}>sunami.</div>
    </div>}
    {showBrand && <div style={{position:'absolute',left:0,right:0,bottom:92,textAlign:'center',fontSize:30,fontWeight:800,color:'#fff',opacity:brandOpacity*.9}}>Apprends en vivant l’histoire.</div>}
  </div>;
};
