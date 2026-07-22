import { useState, useEffect, useRef } from "react";
import {
  Plus, Trash2, Volume2, RotateCcw, Search,
  BookOpen, X, Check, ChevronLeft, ChevronRight,
  Calendar as CalIcon, List as ListIcon, Sparkles, FileText, PenLine,
} from "lucide-react";

// level: 0=모름  1=애매  2=완전암기
const SEED = [
  { id: "s1", hanzi: "你好", pinyin: "nǐ hǎo", meaning: "안녕하세요", category: "인사", level: 0, learnedDate: null },
  { id: "s2", hanzi: "谢谢", pinyin: "xiè xiè", meaning: "감사합니다", category: "인사", level: 0, learnedDate: null },
  { id: "s3", hanzi: "再见", pinyin: "zài jiàn", meaning: "잘 가요", category: "인사", level: 0, learnedDate: null },
  { id: "s4", hanzi: "吃饭", pinyin: "chī fàn", meaning: "밥을 먹다", category: "일상", level: 0, learnedDate: null },
  { id: "s5", hanzi: "朋友", pinyin: "péng yǒu", meaning: "친구", category: "일상", level: 0, learnedDate: null },
  { id: "s6", hanzi: "学习", pinyin: "xué xí", meaning: "공부하다", category: "일상", level: 0, learnedDate: null },
  { id: "s7", hanzi: "时间", pinyin: "shí jiān", meaning: "시간", category: "일상", level: 0, learnedDate: null },
];
const LEVEL_INFO = [
  { label: "모름",     dot: "bg-[#D0C9BB]",   bar: "bg-[#E7E0D2]",       badge: "bg-[#E7E0D2] text-[#8A8175]"        },
  { label: "애매",     dot: "bg-[#E8A838]",   bar: "bg-[#E8A838]/70",    badge: "bg-[#FEF3CD] text-[#C07030]"        },
  { label: "완전암기", dot: "bg-[#4A7A6B]",   bar: "bg-[#4A7A6B]",       badge: "bg-[#4A7A6B]/15 text-[#4A7A6B]"    },
];
const DAILY_GOAL = 5;

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function speak(text) {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN"; u.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch(e){}
}

export default function App() {
  const [words, setWords] = useState([]);
  const [dailyQueue, setDailyQueue] = useState({ date: "", ids: [] });
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("today");
  const [addMode, setAddMode] = useState(null); // null | 'manual' | 'ai'

  useEffect(() => {
    (async () => {
      let w = SEED, q = { date: "", ids: [] };
      try { const r = await window.storage.get("words"); if (r?.value) w = JSON.parse(r.value); } catch(e){}
      try { const r = await window.storage.get("dq"); if (r?.value) q = JSON.parse(r.value); } catch(e){}
      setWords(w); setDailyQueue(q); setLoaded(true);
    })();
  }, []);

  useEffect(() => { if (loaded) window.storage.set("words", JSON.stringify(words)).catch(()=>{}); }, [words, loaded]);
  useEffect(() => { if (loaded) window.storage.set("dq", JSON.stringify(dailyQueue)).catch(()=>{}); }, [dailyQueue, loaded]);

  useEffect(() => {
    if (!loaded) return;
    const t = todayStr();
    if (dailyQueue.date !== t) {
      // 기존 known 필드 마이그레이션 (이전 버전 데이터 호환)
      const migrated = words.map(w => w.level !== undefined ? w : { ...w, level: w.known ? 2 : 0 });
      if (migrated.some((w,i) => w.level !== words[i]?.level)) setWords(migrated);
      const ids = migrated.filter(w => w.level < 2).slice(0, DAILY_GOAL).map(w => w.id);
      setDailyQueue({ date: t, ids });
    }
  }, [loaded, words, dailyQueue.date]);

  function addWords(list) {
    const now = Date.now();
    setWords(prev => [
      ...list.map((w,i) => ({ ...w, id: (now+i).toString(), level: 0, learnedDate: null })),
      ...prev,
    ]);
    setAddMode(null);
  }
  function deleteWord(id) {
    setWords(prev => prev.filter(w=>w.id!==id));
    setDailyQueue(q => ({...q, ids: q.ids.filter(i=>i!==id)}));
  }
  // level: 0=모름 1=애매 2=완전암기
  function markLevel(id, level) {
    setWords(prev => prev.map(w => w.id===id
      ? { ...w, level, learnedDate: level === 2 ? todayStr() : w.learnedDate }
      : w));
  }
  function refillToday() {
    const t = todayStr();
    const done = new Set(dailyQueue.ids);
    const more = words.filter(w => w.level < 2 && !done.has(w.id)).slice(0, DAILY_GOAL).map(w => w.id);
    setDailyQueue({ date: t, ids: [...dailyQueue.ids, ...more] });
  }

  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F0E6]">
      <span className="text-[#8A8175]">불러오는 중...</span>
    </div>
  );

  const todayWords = dailyQueue.ids.map(id=>words.find(w=>w.id===id)).filter(Boolean);
  const todayDone = todayWords.filter(w=>(w.level||0) > 0).length;
  const unknownLeft = words.filter(w=>(w.level||0) < 2 && !dailyQueue.ids.includes(w.id)).length;

  return (
    <div className="min-h-screen bg-[#F5F0E6] text-[#2B2622] pb-20" style={{fontFamily:"'Noto Sans KR',sans-serif"}}>
      <Header totalWords={words.length} todayDone={todayDone} todayTotal={todayWords.length} />

      {tab==="today" && <TodayView todayWords={todayWords} unknownLeft={unknownLeft} onMarkLevel={markLevel} onRefill={refillToday} />}
      {tab==="list"  && <ListView words={words} onDelete={deleteWord} />}
      {tab==="cal"   && <CalendarView words={words} />}

      {addMode===null && <BottomNav tab={tab} setTab={setTab} onAdd={()=>setAddMode("pick")} />}

      {addMode==="pick"   && <AddPicker onManual={()=>setAddMode("manual")} onAI={()=>setAddMode("ai")} onClose={()=>setAddMode(null)} />}
      {addMode==="manual" && <ManualSheet onAdd={w=>addWords([w])} onCancel={()=>setAddMode(null)} />}
      {addMode==="ai"     && <AISheet onAdd={addWords} onCancel={()=>setAddMode(null)} existingHanzi={new Set(words.map(w=>w.hanzi))} />}
    </div>
  );
}

/* ─── Header ─── */
function Header({ totalWords, todayDone, todayTotal }) {
  return (
    <div className="px-5 pt-7 pb-4 relative overflow-hidden">
      <div aria-hidden className="absolute -right-6 -top-6 w-28 h-28 rounded-full" style={{background:"#C23B2E"}} />
      <div aria-hidden className="absolute -right-2 -top-2 w-20 h-20 flex items-center justify-center text-[#F5F0E6] text-3xl" style={{fontFamily:"'Noto Serif KR',serif"}}>字</div>
      <p className="text-xs tracking-[0.2em] text-[#8A8175] uppercase">생활 중국어</p>
      <h1 className="text-3xl font-bold mt-1" style={{fontFamily:"'Noto Serif KR',serif"}}>단어장</h1>
      <p className="text-sm text-[#8A8175] mt-1">오늘 {todayDone}/{todayTotal||DAILY_GOAL}개 · 전체 {totalWords}개</p>
    </div>
  );
}

/* ─── BottomNav ─── */
function BottomNav({ tab, setTab, onAdd }) {
  const items = [
    {key:"today",label:"오늘",icon:BookOpen},
    {key:"list", label:"목록",icon:ListIcon},
    {key:"cal",  label:"달력",icon:CalIcon},
  ];
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E7E0D2] px-2 py-2 flex items-center justify-around z-20">
      {items.map(({key,label,icon:Icon})=>(
        <button key={key} onClick={()=>setTab(key)}
          className={`flex flex-col items-center gap-0.5 px-4 py-1.5 rounded-lg ${tab===key?"text-[#C23B2E]":"text-[#8A8175]"}`}>
          <Icon size={20}/><span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
      <button onClick={onAdd} aria-label="단어 추가"
        className="w-11 h-11 rounded-full bg-[#C23B2E] text-white flex items-center justify-center -mt-1 shadow-md">
        <Plus size={20}/>
      </button>
    </div>
  );
}

/* ─── AddPicker ─── */
function AddPicker({ onManual, onAI, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-end" onClick={onClose}>
      <div className="bg-[#F5F0E6] w-full rounded-t-3xl px-5 pt-5 pb-10" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{fontFamily:"'Noto Serif KR',serif"}}>단어 추가하기</h2>
          <button onClick={onClose} className="p-1 text-[#8A8175]"><X size={20}/></button>
        </div>
        <div className="space-y-3">
          <button onClick={onAI}
            className="w-full bg-[#C23B2E] text-white rounded-2xl px-4 py-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles size={20}/>
            </div>
            <div>
              <p className="font-bold">일기 / 수업 노트에서 추출</p>
              <p className="text-sm text-white/70 mt-0.5">텍스트 붙여넣으면 AI가 단어 자동 추출</p>
            </div>
          </button>
          <button onClick={onManual}
            className="w-full bg-white border border-[#E7E0D2] rounded-2xl px-4 py-4 flex items-center gap-4 text-left">
            <div className="w-10 h-10 rounded-xl bg-[#F5F0E6] flex items-center justify-center shrink-0">
              <PenLine size={20} className="text-[#5A5347]"/>
            </div>
            <div>
              <p className="font-bold text-[#2B2622]">직접 입력</p>
              <p className="text-sm text-[#8A8175] mt-0.5">한자, 핀인, 뜻 직접 입력</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── AI Sheet ─── */
function AISheet({ onAdd, onCancel, existingHanzi }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState(null); // [{hanzi,pinyin,meaning,category}]
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState("");

  async function extract() {
    if (!text.trim()) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `다음 텍스트에서 중국어 단어(한자)를 모두 찾아 JSON 배열로 반환해줘.
각 단어는 { "hanzi": "한자", "pinyin": "핀인(성조 포함)", "meaning": "한국어 뜻", "category": "카테고리(인사/음식/일상/여행/동사 등)" } 형식.
JSON 배열만 반환, 다른 텍스트 없이.

텍스트:
${text}`
          }]
        })
      });
      const data = await res.json();
      const raw = data.content.map(c=>c.text||"").join("").trim().replace(/```json|```/g,"").trim();
      const parsed = JSON.parse(raw);
      const filtered = parsed.filter(w => !existingHanzi.has(w.hanzi));
      setExtracted(filtered);
      setSelected(new Set(filtered.map((_,i)=>i)));
    } catch(e) {
      setError("추출 중 오류가 발생했어요. 다시 시도해보세요.");
    }
    setLoading(false);
  }

  function toggle(i) {
    setSelected(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  }

  function confirm() {
    const toAdd = extracted.filter((_,i)=>selected.has(i));
    if (toAdd.length) onAdd(toAdd);
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-end" onClick={onCancel}>
      <div
        className="bg-[#F5F0E6] w-full rounded-t-3xl px-5 pt-5 pb-8 flex flex-col"
        style={{maxHeight:"90vh"}}
        onClick={e=>e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="font-bold text-lg" style={{fontFamily:"'Noto Serif KR',serif"}}>
            {extracted ? "단어 확인" : "노트에서 단어 추출"}
          </h2>
          <button onClick={onCancel} className="p-1 text-[#8A8175]"><X size={20}/></button>
        </div>

        {!extracted ? (
          <>
            <p className="text-sm text-[#8A8175] mb-3 shrink-0">
              중국어 수업 노트나 일기를 붙여넣으면 AI가 단어를 자동으로 찾아줘요.
            </p>
            <textarea
              value={text}
              onChange={e=>setText(e.target.value)}
              placeholder={"예시:\n今天我去超市买了很多东西。\n或者 수업 노트에서 배운 단어들...\n\n한국어 설명이 섞여 있어도 괜찮아요!"}
              className="flex-1 bg-white border border-[#E7E0D2] rounded-xl px-4 py-3 text-sm outline-none resize-none"
              style={{minHeight:180}}
            />
            {error && <p className="text-red-500 text-sm mt-2 shrink-0">{error}</p>}
            <button
              onClick={extract}
              disabled={!text.trim()||loading}
              className="mt-4 shrink-0 w-full bg-[#C23B2E] text-white py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-40"
            >
              {loading ? (
                <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"/>추출 중...</>
              ) : (
                <><Sparkles size={18}/>단어 추출하기</>
              )}
            </button>
          </>
        ) : (
          <>
            {extracted.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-[#8A8175] py-8">
                <p className="mb-1 font-medium">새 단어를 찾지 못했어요.</p>
                <p className="text-sm">이미 단어장에 있거나 중국어 단어가 없을 수 있어요.</p>
                <button onClick={()=>setExtracted(null)} className="mt-4 text-sm text-[#C23B2E] font-medium">다시 시도하기</button>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#8A8175] mb-3 shrink-0">
                  {extracted.length}개 단어 발견 · 추가할 단어를 선택하세요
                </p>
                <div className="overflow-y-auto flex-1 space-y-2">
                  {extracted.map((w,i)=>(
                    <button
                      key={i}
                      onClick={()=>toggle(i)}
                      className={`w-full text-left bg-white rounded-xl border px-4 py-3 flex items-center gap-3 transition-colors ${
                        selected.has(i) ? "border-[#4A7A6B]" : "border-[#E7E0D2] opacity-50"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${selected.has(i)?"bg-[#4A7A6B] border-[#4A7A6B]":"border-[#D0C9BB]"}`}>
                        {selected.has(i) && <Check size={12} className="text-white"/>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-lg" style={{fontFamily:"'Noto Serif KR',serif"}}>{w.hanzi}</span>
                          <span className="text-sm text-[#C23B2E]">{w.pinyin}</span>
                        </div>
                        <p className="text-sm text-[#5A5347] truncate">{w.meaning}</p>
                      </div>
                      <span className="text-xs text-[#B5AC9C] shrink-0">{w.category}</span>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3 mt-4 shrink-0">
                  <button onClick={()=>setExtracted(null)} className="px-4 py-3 rounded-xl border border-[#E7E0D2] text-[#5A5347] text-sm font-medium">
                    다시 입력
                  </button>
                  <button
                    onClick={confirm}
                    disabled={selected.size===0}
                    className="flex-1 bg-[#4A7A6B] text-white py-3 rounded-xl font-medium disabled:opacity-40"
                  >
                    {selected.size}개 단어장에 추가
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Manual Sheet ─── */
function ManualSheet({ onAdd, onCancel }) {
  const [hanzi, setHanzi] = useState("");
  const [pinyin, setPinyin] = useState("");
  const [meaning, setMeaning] = useState("");
  const [cat, setCat] = useState("일상");
  const CATS = ["인사","일상","음식","여행","동사","형용사","기타"];
  const valid = hanzi.trim() && pinyin.trim() && meaning.trim();
  return (
    <div className="fixed inset-0 bg-black/40 z-30 flex items-end" onClick={onCancel}>
      <div className="bg-[#F5F0E6] w-full rounded-t-3xl px-5 pt-5 pb-8" onClick={e=>e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-lg" style={{fontFamily:"'Noto Serif KR',serif"}}>직접 입력</h2>
          <button onClick={onCancel} className="p-1 text-[#8A8175]"><X size={20}/></button>
        </div>
        <div className="space-y-4">
          <Field label="한자">
            <input value={hanzi} onChange={e=>setHanzi(e.target.value)} placeholder="예: 学习"
              className="w-full text-2xl px-3 py-3 rounded-xl border border-[#E7E0D2] bg-white outline-none focus:border-[#C23B2E]"
              style={{fontFamily:"'Noto Serif KR',serif"}}/>
          </Field>
          <Field label="핀인">
            <input value={pinyin} onChange={e=>setPinyin(e.target.value)} placeholder="예: xué xí"
              className="w-full px-3 py-3 rounded-xl border border-[#E7E0D2] bg-white outline-none focus:border-[#C23B2E]"/>
          </Field>
          <Field label="뜻">
            <input value={meaning} onChange={e=>setMeaning(e.target.value)} placeholder="예: 공부하다"
              className="w-full px-3 py-3 rounded-xl border border-[#E7E0D2] bg-white outline-none focus:border-[#C23B2E]"/>
          </Field>
          <Field label="카테고리">
            <div className="flex gap-2 flex-wrap">
              {CATS.map(c=>(
                <button key={c} onClick={()=>setCat(c)}
                  className={`px-3 py-1.5 rounded-full text-sm border ${cat===c?"bg-[#2B2622] text-white border-[#2B2622]":"bg-white border-[#E7E0D2] text-[#5A5347]"}`}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <button disabled={!valid}
          onClick={()=>onAdd({hanzi:hanzi.trim(),pinyin:pinyin.trim(),meaning:meaning.trim(),category:cat})}
          className="w-full mt-6 bg-[#C23B2E] text-white py-3.5 rounded-xl font-medium disabled:opacity-40">
          추가하기
        </button>
      </div>
    </div>
  );
}
function Field({ label, children }) {
  return <div><label className="block text-xs font-medium text-[#8A8175] mb-1.5 tracking-wide">{label}</label>{children}</div>;
}

/* ─── Focus Modal (더블탭) ─── */
function FocusModal({ words, startIdx, onClose, onMarkLevel }) {
  const [idx, setIdx] = useState(startIdx);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState("both");

  useEffect(()=>{ setFlipped(false); }, [idx, mode]);

  const word = words[idx];
  const lv = word?.level ?? 0;
  if (!word) return null;

  function prev() { setIdx(i => (i - 1 + words.length) % words.length); }
  function next() { setIdx(i => (i + 1) % words.length); }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{background:"#0E0D0B"}}>
      {/* 상단 바 */}
      <div className="flex items-center justify-between px-5 pt-6 pb-2">
        <span className="text-white/30 text-sm">{idx+1} / {words.length}</span>
        <button onClick={onClose} className="text-white/40 p-1"><X size={24}/></button>
      </div>

      {/* 모드 토글 */}
      <div className="flex justify-center mt-1 mb-2">
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
          {[["both","중·한"],["zh","중국어만"],["ko","한국어만"]].map(([key,label])=>(
            <button key={key} onClick={()=>setMode(key)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                mode===key
                  ? "bg-white text-black font-extrabold text-sm"
                  : "text-white/30 font-normal text-xs"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 영역 */}
      <div className="flex-1 flex items-stretch gap-2 px-3">
        <button onClick={prev}
          className="w-10 self-center rounded-full border border-white/10 flex items-center justify-center shrink-0" style={{height:40}}>
          <ChevronLeft size={22} className="text-white/50"/>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center select-none py-6">

          {/* 중국어만 */}
          {mode==="zh" && (
            <span
              className="font-bold text-white text-center"
              style={{fontFamily:"'Noto Serif KR',serif", fontSize:"22vw", lineHeight:1}}>
              {word.hanzi}
            </span>
          )}

          {/* 한국어만 */}
          {mode==="ko" && (
            <span className="text-5xl font-bold text-white text-center leading-snug">
              {word.meaning}
            </span>
          )}

          {/* 중·한 */}
          {mode==="both" && (
            <>
              <span
                className="font-bold text-white text-center"
                style={{fontFamily:"'Noto Serif KR',serif", fontSize:"20vw", lineHeight:1}}>
                {word.hanzi}
              </span>
              <span className="text-[#C23B2E] mt-3 text-lg">{word.pinyin}</span>
              <div className="w-12 h-px bg-white/15 my-4"/>
              <span className="text-xl text-white/70 text-center">{word.meaning}</span>
            </>
          )}

          <button onClick={e=>{e.stopPropagation();speak(word.hanzi);}}
            className="mt-10 flex items-center gap-2 text-[#4A7A6B] text-sm">
            <Volume2 size={20}/> 발음 듣기
          </button>
        </div>

        <button onClick={next}
          className="w-10 self-center rounded-full border border-white/10 flex items-center justify-center shrink-0" style={{height:40}}>
          <ChevronRight size={22} className="text-white/50"/>
        </button>
      </div>

      {/* 3단계 버튼 */}
      <div className="px-5 pb-10 flex gap-2">
        {[0,1,2].map(l=>(
          <button key={l} onClick={()=>onMarkLevel(word.id, l)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
              lv===l
                ? l===0?"border-[#B5AC9C] bg-[#B5AC9C]/20 text-[#D0C9BB]"
                : l===1?"border-[#E8A838] bg-[#E8A838]/20 text-[#E8A838]"
                :       "border-[#4A7A6B] bg-[#4A7A6B]/20 text-[#5DB89F]"
                : "border-white/10 text-white/40"
            }`}>
            {LEVEL_INFO[l].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Today View ─── */
function TodayView({ todayWords, unknownLeft, onMarkLevel, onRefill }) {
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState("both");
  const [flipped, setFlipped] = useState(false);
  const [focusIdx, setFocusIdx] = useState(null);
  const tapTimer = useRef(null);
  const allDone = todayWords.length > 0 && todayWords.every(w => (w.level??0) > 0);

  useEffect(()=>{ setFlipped(false); }, [idx, mode]);
  useEffect(()=>{
    if (idx >= todayWords.length && todayWords.length > 0) setIdx(todayWords.length-1);
  }, [todayWords.length]);

  if (todayWords.length === 0) return (
    <div className="px-5 flex flex-col items-center justify-center text-center" style={{minHeight:"55vh"}}>
      <div className="text-5xl mb-3">📭</div>
      <p className="font-bold mb-1" style={{fontFamily:"'Noto Serif KR',serif"}}>오늘의 단어가 없어요</p>
      <p className="text-sm text-[#8A8175]">목록 탭에서 단어를 추가해보세요.</p>
    </div>
  );

  if (allDone) return (
    <div className="px-5 flex flex-col items-center justify-center text-center" style={{minHeight:"55vh"}}>
      <div className="text-5xl mb-3">🎉</div>
      <p className="text-lg font-bold mb-1" style={{fontFamily:"'Noto Serif KR',serif"}}>오늘의 {todayWords.length}개 완료!</p>
      <p className="text-sm text-[#8A8175] mb-6">내일 새로운 {DAILY_GOAL}개가 준비될 거예요.</p>
      {unknownLeft > 0 && (
        <button onClick={onRefill} className="px-5 py-3 rounded-xl border border-[#E7E0D2] text-[#5A5347] font-medium text-sm">
          오늘 {DAILY_GOAL}개 더 학습하기
        </button>
      )}
    </div>
  );

  const safeIdx = Math.min(idx, todayWords.length-1);
  const word = todayWords[safeIdx];
  const lv = word.level ?? 0;

  function prev() { if (safeIdx > 0) setIdx(safeIdx-1); }
  function next() { if (safeIdx < todayWords.length-1) setIdx(safeIdx+1); }

  // 싱글탭 = 뒤집기, 더블탭 = 집중모드
  function handleCardTap() {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      setFocusIdx(safeIdx); // 더블탭
    } else {
      tapTimer.current = setTimeout(()=>{
        tapTimer.current = null;
        if (mode === "both") setFlipped(f=>!f); // 싱글탭
      }, 280);
    }
  }

  const borderColor = lv===0?"border-[#E7E0D2]": lv===1?"border-[#E8A838]/50":"border-[#4A7A6B]/50";

  return (
    <div className="px-5 flex flex-col" style={{minHeight:"60vh"}}>

      {/* 집중 모달 */}
      {focusIdx !== null && (
        <FocusModal words={todayWords} startIdx={focusIdx} onClose={()=>setFocusIdx(null)} onMarkLevel={onMarkLevel}/>
      )}

      {/* 진행 바 - 3단계 색상 */}
      <div className="flex gap-1.5 mb-4">
        {todayWords.map((w,i)=>{
          const l = w.level??0;
          const barColor = i===safeIdx ? "bg-[#C23B2E]" : LEVEL_INFO[l].bar;
          return <button key={w.id} onClick={()=>setIdx(i)} className={`h-1.5 flex-1 rounded-full transition-colors ${barColor}`}/>;
        })}
      </div>

      {/* 표시 모드 토글 */}
      <div className="flex items-center justify-center mb-4">
        <div className="flex bg-white border border-[#E7E0D2] rounded-xl p-1 gap-1">
          {[["both","중·한"],["zh","중국어만"],["ko","한국어만"]].map(([key,label])=>(
            <button key={key} onClick={()=>setMode(key)}
              className={`px-3 py-2 rounded-lg transition-colors ${
                mode===key
                  ? "bg-[#2B2622] text-white font-extrabold text-sm"
                  : "text-[#C0B8AE] font-normal text-xs"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 카드 + 좌우 화살표 */}
      <div className="flex items-center gap-3">
        <button onClick={prev} disabled={safeIdx===0}
          className="w-10 h-10 rounded-full bg-white border border-[#E7E0D2] flex items-center justify-center shrink-0 disabled:opacity-25">
          <ChevronLeft size={20} className="text-[#5A5347]"/>
        </button>

        <div
          onClick={handleCardTap}
          className={`relative flex-1 bg-white rounded-3xl border-2 shadow-sm flex flex-col items-center justify-center px-5 select-none cursor-pointer ${borderColor}`}
          style={{minHeight:230, paddingTop:36, paddingBottom:36}}
        >
          {/* 레벨 뱃지 */}
          {lv > 0 && (
            <span className={`absolute top-3 left-3 text-[10px] px-2 py-0.5 rounded-full font-bold ${LEVEL_INFO[lv].badge}`}>
              {LEVEL_INFO[lv].label}
            </span>
          )}
          <span className="absolute top-3 right-3 text-[10px] text-[#C5BCAE]">더블탭 = 집중모드</span>

          {mode==="zh" && (
            <div className="flex flex-col items-center">
              <span className="font-bold" style={{fontFamily:"'Noto Serif KR',serif", fontSize:"18vw", lineHeight:1}}>{word.hanzi}</span>
              <span className="text-[#C23B2E] mt-2 text-base">{word.pinyin}</span>
            </div>
          )}
          {mode==="ko" && (
            <div className="flex flex-col items-center">
              <span className="text-3xl font-bold text-[#2B2622]">{word.meaning}</span>
              <span className="text-[#8A8175] mt-2 text-sm">{word.pinyin}</span>
            </div>
          )}
          {mode==="both" && (
            <div className="flex flex-col items-center">
              <span className="text-6xl font-bold" style={{fontFamily:"'Noto Serif KR',serif"}}>{word.hanzi}</span>
              <span className="text-[#C23B2E] mt-2 text-base">{word.pinyin}</span>
              <div className="w-8 h-px bg-[#E7E0D2] my-3"/>
              <span className="text-base text-[#8A8175]">{word.meaning}</span>
            </div>
          )}
        </div>

        <button onClick={next} disabled={safeIdx===todayWords.length-1}
          className="w-10 h-10 rounded-full bg-white border border-[#E7E0D2] flex items-center justify-center shrink-0 disabled:opacity-25">
          <ChevronRight size={20} className="text-[#5A5347]"/>
        </button>
      </div>

      {/* N/전체 + 발음 */}
      <div className="flex items-center justify-between mt-3 px-1">
        <span className="text-sm text-[#8A8175]">{safeIdx+1} / {todayWords.length}</span>
        <button onClick={()=>speak(word.hanzi)} className="flex items-center gap-1.5 text-[#4A7A6B] text-sm font-medium">
          <Volume2 size={17}/> 발음 듣기
        </button>
      </div>

      {/* 3단계 버튼 */}
      <div className="flex gap-2 mt-4 mb-2">
        {[0,1,2].map(l=>(
          <button key={l}
            onClick={()=>{ onMarkLevel(word.id,l); if(l>0&&safeIdx<todayWords.length-1) setIdx(safeIdx+1); }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors ${
              lv===l
                ? l===0?"border-[#B5AC9C] bg-[#E7E0D2] text-[#8A8175]"
                : l===1?"border-[#E8A838] bg-[#FEF3CD] text-[#C07030]"
                :       "border-[#4A7A6B] bg-[#4A7A6B]/15 text-[#4A7A6B]"
                : "border-[#E7E0D2] bg-white text-[#B5AC9C]"
            }`}>
            {l===0&&<RotateCcw size={13} className="inline mb-0.5 mr-1"/>}
            {LEVEL_INFO[l].label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── List View ─── */
function ListView({ words, onDelete }) {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("전체");
  const cats = ["전체", ...Array.from(new Set(words.map(w=>w.category||"기타")))];
  const filtered = words.filter(w=>{
    const mc = cat==="전체"||(w.category||"기타")===cat;
    const q = query.trim().toLowerCase();
    return mc && (!q || w.hanzi.includes(q)||w.pinyin.toLowerCase().includes(q)||w.meaning.includes(q));
  });
  return (
    <div className="px-5">
      <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2.5 border border-[#E7E0D2] mb-3">
        <Search size={18} className="text-[#8A8175]"/>
        <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="한자, 핀인, 뜻 검색"
          className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#B5AC9C]"/>
        {query && <button onClick={()=>setQuery("")}><X size={16} className="text-[#8A8175]"/></button>}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {cats.map(c=>(
          <button key={c} onClick={()=>setCat(c)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border ${cat===c?"bg-[#2B2622] text-white border-[#2B2622]":"bg-white text-[#5A5347] border-[#E7E0D2]"}`}>
            {c}
          </button>
        ))}
      </div>
      {filtered.length===0 && <div className="text-center py-16 text-[#8A8175]">{words.length===0?"단어가 없어요. + 버튼으로 추가해보세요.":"검색 결과가 없어요."}</div>}
      <div className="space-y-2">
        {filtered.map(w=>(
          <div key={w.id} className="bg-white rounded-xl border border-[#E7E0D2] px-4 py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold" style={{fontFamily:"'Noto Serif KR',serif"}}>{w.hanzi}</span>
                <span className="text-sm text-[#C23B2E]">{w.pinyin}</span>
              </div>
              <p className="text-sm text-[#5A5347] truncate">{w.meaning}</p>
            </div>
            {(w.level??0) > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${LEVEL_INFO[w.level??0].badge}`}>
                {LEVEL_INFO[w.level??0].label}
              </span>
            )}
            <button onClick={()=>speak(w.hanzi)} className="p-2 rounded-full hover:bg-[#F5F0E6] text-[#4A7A6B]"><Volume2 size={18}/></button>
            <button onClick={()=>onDelete(w.id)} className="p-2 rounded-full hover:bg-[#F5F0E6] text-[#B5AC9C]"><Trash2 size={16}/></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Calendar View ─── */
function CalendarView({ words }) {
  const [cursor, setCursor] = useState(()=>{ const d=new Date(); return new Date(d.getFullYear(),d.getMonth(),1); });
  const [sel, setSel] = useState(null);
  const year=cursor.getFullYear(), month=cursor.getMonth();
  const countsByDate = {};
  words.forEach(w=>{ if((w.level??0)===2&&w.learnedDate) countsByDate[w.learnedDate]=(countsByDate[w.learnedDate]||0)+1; });
  const firstDay=new Date(year,month,1).getDay(), daysInMonth=new Date(year,month+1,0).getDate();
  const cells=[...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const t=todayStr();
  const thisMonthTotal=Object.entries(countsByDate).filter(([k])=>k.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)).reduce((s,[,v])=>s+v,0);
  const selWords=sel?words.filter(w=>(w.level??0)===2&&w.learnedDate===sel):[];
  return (
    <div className="px-5">
      <div className="flex items-center justify-between mb-3">
        <button onClick={()=>{setCursor(new Date(year,month-1,1));setSel(null);}} className="p-2 text-[#5A5347]"><ChevronLeft size={20}/></button>
        <h2 className="font-bold" style={{fontFamily:"'Noto Serif KR',serif"}}>{year}년 {month+1}월</h2>
        <button onClick={()=>{setCursor(new Date(year,month+1,1));setSel(null);}} className="p-2 text-[#5A5347]"><ChevronRight size={20}/></button>
      </div>
      <p className="text-sm text-[#8A8175] mb-3">이번 달 외운 단어 {thisMonthTotal}개</p>
      <div className="grid grid-cols-7 text-center text-xs text-[#8A8175] mb-2">
        {["일","월","화","수","목","금","토"].map(d=><div key={d}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((d,i)=>{
          if(d===null) return <div key={i}/>;
          const ds=`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          const count=countsByDate[ds]||0;
          const intensity=count===0?0:count<DAILY_GOAL?1:2;
          const bg=intensity===0?"bg-white":intensity===1?"bg-[#4A7A6B]/30":"bg-[#4A7A6B]";
          const tc=intensity===2?"text-white":"text-[#2B2622]";
          return (
            <button key={i} onClick={()=>count>0&&setSel(ds===sel?null:ds)}
              className={`aspect-square rounded-lg border ${bg} ${tc} flex flex-col items-center justify-center text-sm ${ds===sel?"ring-2 ring-[#C23B2E]":"border-[#E7E0D2]"}`}>
              <span className={ds===t?"font-bold":""}>{d}</span>
              {count>0&&<span className="text-[9px] leading-none mt-0.5">{count}</span>}
            </button>
          );
        })}
      </div>
      {sel && selWords.length>0 && (
        <div className="mt-5">
          <p className="text-sm font-medium text-[#5A5347] mb-2">{sel} 외운 단어 {selWords.length}개</p>
          <div className="space-y-2">
            {selWords.map(w=>(
              <div key={w.id} className="bg-white rounded-xl border border-[#E7E0D2] px-4 py-2.5 flex items-center gap-3">
                <span className="text-lg font-bold" style={{fontFamily:"'Noto Serif KR',serif"}}>{w.hanzi}</span>
                <span className="text-sm text-[#C23B2E]">{w.pinyin}</span>
                <span className="text-sm text-[#5A5347] flex-1 text-right truncate">{w.meaning}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
