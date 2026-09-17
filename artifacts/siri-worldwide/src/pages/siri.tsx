import { useState } from 'react'
export default function SiriApp(){
const [tab,setTab]=useState('chats')
const chats=[
{name:"Mama SIRI",msg:"Habari KING...",time:"01:42",unread:2},
{name:"SIRI Group",msg:"KING ameingia",time:"01:40",unread:5},
{name:"Ahmed",msg:"APK iko tayari?",time:"Today, 01:40 PM",unread:0}
]
const calls=[
{name:"Mama SIRI",type:"missed",time:"Today, 01:40 PM"},
{name:"Ahmed",type:"incoming",time:"Today, 10:00 AM"}
]
return(
<div className="bg-[#0b141a] min-h-screen text-white pb-[65px]">
<div className="bg-[#202c33] p-4 flex justify-between"><h1 className="text-xl font-bold">SIRI Worldwide</h1></div>
<div className="p-2">
{tab==='chats' && <div>{chats.map((c,i)=><div key={i} className="flex p-3 border-b border-[#202c33]"><div className="w-12 h-12 rounded-full bg-[#00a884] flex items-center justify-center mr-3">{c.name[0]}</div><div className="flex-1"><div className="flex justify-between"><span className="font-bold">{c.name}</span><span className="text-xs text-[#8696a0]">{c.time}</span></div><div className="flex justify-between"><span className="text-sm text-[#8696a0]">{c.msg}</span>{c.unread>0 && <span className="bg-[#00a884] text-xs rounded-full px-2">{c.unread}</span>}</div></div></div>)}</div>}
{tab==='groups' && <div className="p-4"><h2 className="font-bold">Groups</h2><p className="text-[#8696a0] mt-2">SIRI Worldwide Group - 256 members</p></div>}
{tab==='status' && <div className="p-4"><h2 className="font-bold">Status</h2><div className="mt-4 flex gap-3"><div className="w-14 h-14 rounded-full border-2 border-[#00a884]"></div><span>My Status</span></div></div>}
{tab==='calls' && <div className="p-4">{calls.map((c,i)=><div key={i} className="flex p-3 border-b border-[#202c33]"><div className="w-12 h-12 rounded-full bg-[#202c33] mr-3 flex items-center justify-center">📞</div><div><p className="font-bold">{c.name}</p><p className="text-sm text-[#8696a0]">{c.type} - {c.time}</p></div></div>)}</div>}
{tab==='settings' && <div className="p-4 space-y-4"><h2 className="font-bold">Settings</h2><p>Profile: KING SIRI</p><p>Privacy, Chats, Notifications</p></div>}
{tab==='contacts' && <div className="p-4"><h2 className="font-bold">Contacts</h2><p className="mt-2">Ahmed, Mama SIRI, SIRI Team</p></div>}
</div>
<div className="fixed bottom-0 w-full bg-[#202c33] flex justify-around py-2 border-t border-[#0b141a]">
<button onClick={()=>setTab('chats')} className={tab==='chats'?'text-[#00a884]':''}>Chats</button>
<button onClick={()=>setTab('groups')} className={tab==='groups'?'text-[#00a884]':''}>Groups</button>
<button onClick={()=>setTab('status')} className={tab==='status'?'text-[#00a884]':''}>Status</button>
<button onClick={()=>setTab('calls')} className={tab==='calls'?'text-[#00a884]':''}>Calls</button>
<button onClick={()=>setTab('settings')} className={tab==='settings'?'text-[#00a884]':''}>Settings</button>
</div>
</div>
)}
