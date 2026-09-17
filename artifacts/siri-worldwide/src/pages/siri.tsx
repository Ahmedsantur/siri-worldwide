import { useState } from 'react'
export default function SiriApp(){
  const [tab,setTab]=useState('chats')
  const chats=[{name:"Mama SIRI",msg:"Habari KING...",time:"01:42",unread:2},{name:"SIRI Group",msg:"Ahmed: APK iko tayari",time:"01:30",unread:5}]
  const calls=[{name:"Mama SIRI",type:"missed",time:"Today, 01:40 PM"},{name:"Ahmed",type:"incoming",time:"Today, 11:20 AM"}]
  return(
    <div className="bg-[#0b141a] min-h-screen text-white pb-[65px]">
      <div className="bg-[#202c33] p-4 flex justify-between"><h1 className="text-xl font-bold">SIRI Worldwide</h1><span>🔍 ⋮</span></div>
      {tab==='chats' && <div>{chats.map((c,i)=><div key={i} className="flex p-3 border-b border-[#202c33] gap-3"><div className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center">{c.name[0]}</div><div className="flex-1"><div className="flex justify-between"><b>{c.name}</b><span className="text-xs text-gray-400">{c.time}</span></div><div className="flex justify-between"><span className="text-sm text-gray-400">{c.msg}</span>{c.unread>0 && <span className="bg-[#00a884] text-xs px-2 rounded-full">{c.unread}</span>}</div></div></div>)}<button onClick={()=>setTab('contacts')} className="fixed bottom-20 right-5 bg-[#00a884] w-14 h-14 rounded-full text-2xl">💬</button></div>}
      {tab==='calls' && <div><div className="p-3 flex gap-3 text-[#00a884]"><span className="bg-[#00a884] w-10 h-10 rounded-full flex items-center justify-center">🔗</span> Create call link</div>{calls.map((c,i)=><div key={i} className="flex p-3 gap-3 border-b border-[#202c33]"><div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">{c.name[0]}</div><div className="flex-1"><p className={c.type==='missed'?'text-red-500':''}>{c.name}</p><p className="text-xs text-gray-400">{c.time}</p></div><div className="text-[#00a884]">📞</div></div>)}<button className="fixed bottom-20 right-5 bg-[#00a884] w-14 h-14 rounded-full text-2xl">📞</button></div>}
      {tab==='groups' && <div className="p-4"><h2 className="font-bold">Groups</h2><p className="mt-4 text-gray-400">SIRI Worldwide Official</p></div>}
      {tab==='status' && <div className="p-4"><h2 className="font-bold">Status</h2><div className="mt-4 flex gap-3"><div className="w-12 h-12 bg-[#00a884] rounded-full"></div><div><b>My Status</b><p className="text-xs text-gray-400">Tap to add</p></div></div></div>}
      {tab==='settings' && <div className="p-4 space-y-4"><h2 className="font-bold">Settings</h2><p>👤 Profile</p><p>🔒 Privacy</p><p>💬 Chats</p></div>}
      {tab==='contacts' && <div><div className="p-4 bg-[#202c33] flex gap-3"><span onClick={()=>setTab('chats')}>←</span><b>Contacts</b></div><div className="p-4 text-gray-400">Contacts za simu zitaonekana hapa baada ya permission</div></div>}
      <div className="fixed bottom-0 w-full bg-[#202c33] flex justify-around py-2 border-t border-[#2a3942]">
        <button onClick={()=>setTab('chats')} className={tab==='chats'?'text-[#00a884]':''}>💬<p className="text-[10px]">Chats</p></button>
        <button onClick={()=>setTab('groups')} className={tab==='groups'?'text-[#00a884]':''}>👥<p className="text-[10px]">Groups</p></button>
        <button onClick={()=>setTab('status')} className={tab==='status'?'text-[#00a884]':''}>⭕<p className="text-[10px]">Status</p></button>
        <button onClick={()=>setTab('calls')} className={tab==='calls'?'text-[#00a884]':''}>📞<p className="text-[10px]">Calls</p></button>
        <button onClick={()=>setTab('settings')} className={tab==='settings'?'text-[#00a884]':''}>⚙️<p className="text-[10px]">Settings</p></button>
      </div>
    </div>
  )
}
