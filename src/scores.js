import {
  collection,
  addDoc,
  getDocs,
  getCountFromServer,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'

// Haftanın başı: en son Pazar (00:00:00)
// Pazartesi'den itibaren yeni Pazar → hafta otomatik döner
export function getWeekStart() {
  const now  = new Date()
  const sun  = new Date(now)
  sun.setDate(now.getDate() - now.getDay()) // 0=Pazar
  sun.setHours(0, 0, 0, 0)
  return sun.toISOString().split('T')[0] // "YYYY-MM-DD"
}

/**
 * Skoru kaydet, sonra rank/percentile + top listelerini döndür.
 * @param {'scores_wpm'|'scores_falling'} col
 * @param {string} name
 * @param {number} score
 * @returns {Promise<{rank, total, weekRank, weekTotal, topAll, topWeek}>}
 */
export async function saveScore(col, name, score) {
  const weekStart = getWeekStart()

  await addDoc(collection(db, col), {
    name,
    score,
    weekStart,
    createdAt: serverTimestamp(),
  })

  const [allResult, weekResult, topAll, topWeek] = await Promise.all([
    // All-time: score'dan yüksek kayıt sayısı → rank
    getCountFromServer(query(collection(db, col), where('score', '>', score))),
    // Bu hafta: aynı şekilde
    getCountFromServer(query(
      collection(db, col),
      where('weekStart', '==', weekStart),
      where('score', '>', score),
    )),
    // All-time top 10
    getDocs(query(collection(db, col), orderBy('score', 'desc'), limit(10))),
    // Bu hafta top 10
    getDocs(query(
      collection(db, col),
      where('weekStart', '==', weekStart),
      orderBy('score', 'desc'),
      limit(10),
    )),
  ])

  const rank     = allResult.data().count + 1
  const total    = (await getCountFromServer(collection(db, col))).data().count
  const weekRank = weekResult.data().count + 1
  const weekTotal = (await getCountFromServer(
    query(collection(db, col), where('weekStart', '==', weekStart))
  )).data().count

  return {
    rank,
    total,
    weekRank,
    weekTotal,
    topAll:  topAll.docs.map(d  => ({ id: d.id,  ...d.data()  })),
    topWeek: topWeek.docs.map(d => ({ id: d.id,  ...d.data()  })),
  }
}

/**
 * Sadece leaderboard çek (isim kaydetmeden — "atla" sonrası).
 */
export async function getLeaderboards(col) {
  const weekStart = getWeekStart()
  const [topAll, topWeek, totalSnap, weekSnap] = await Promise.all([
    getDocs(query(collection(db, col), orderBy('score', 'desc'), limit(10))),
    getDocs(query(
      collection(db, col),
      where('weekStart', '==', weekStart),
      orderBy('score', 'desc'),
      limit(10),
    )),
    getCountFromServer(collection(db, col)),
    getCountFromServer(query(collection(db, col), where('weekStart', '==', weekStart))),
  ])
  return {
    rank: null,
    total: totalSnap.data().count,
    weekRank: null,
    weekTotal: weekSnap.data().count,
    topAll:  topAll.docs.map(d  => ({ id: d.id, ...d.data() })),
    topWeek: topWeek.docs.map(d => ({ id: d.id, ...d.data() })),
  }
}
