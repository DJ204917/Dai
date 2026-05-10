import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { courses, equipment } from "../data/mock";

interface Course {
  id: string;
  title: string;
  coach: string;
  time: string;
  seats: number;
  enrolled: number;
  price: number;
  image: string;
  intro: string;
  highlights: string[];
  remainingSeats: number;
}

interface Equipment {
  id: string;
  name: string;
  price: number;
  deposit: number;
  stock: number;
  totalStock: number;
  description: string;
  depositMode: "offline" | "online_hold";
}

export default function Detail() {
  const { type, id } = useParams();
  const isCourse = type === "course";
  const [item, setItem] = useState<Course | Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let foundItem: Course | Equipment | null = null;
        if (isCourse) {
          foundItem = courses.find(c => c.id === id) || null;
        } else {
          foundItem = equipment.find(e => e.id === id) || null;
        }
        if (!foundItem) {
          throw new Error('Item not found');
        }
        setItem(foundItem);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [type, id, isCourse]);

  if (loading) {
    return (
      <div className="page compact-page">
        <section className="panel">
          <h1>加载中...</h1>
        </section>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="page compact-page">
        <section className="panel">
          <h1>没有找到详情</h1>
          <p>这个项目可能已经下架或地址不正确。</p>
          <Link className="primary-button" to="/">返回首页</Link>
        </section>
      </div>
    );
  }

  const title = "title" in item ? item.title : item.name;
  const image = item.image;
  const intro = item.intro;
  const highlights = "highlights" in item ? item.highlights : [];
  const paymentUrl = isCourse
    ? `/payment?service=course&type=course&item=${item.id}`
    : `/payment?service=rental&type=equipment&item=${item.id}`;

  return (
    <div className="detail-page">
      <section className="detail-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(7, 64, 66, 0.86), rgba(7, 64, 66, 0.28)), url(${image})` }}>
        <div className="detail-hero-content">
          <Link className="back-link" to="/">
            <ArrowLeft size={18} />
            返回首页
          </Link>
          <p className="eyebrow">{isCourse ? "课程详情" : "装备详情"}</p>
          <h1>{title}</h1>
          <p>{intro}</p>
          <Link className="primary-button" to={paymentUrl}>
            {isCourse ? "立即报名" : "立即租赁"} <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <main className="page detail-content">
        <section className="detail-grid">
          <article className="panel">
            <h2>{isCourse ? "课程介绍" : "使用说明"}</h2>
            <p className="detail-intro">{intro}</p>
            <div className="highlight-list">
              {highlights.map((highlight) => (
                <div key={highlight}>
                  <CheckCircle2 size={18} />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </article>

          <aside className="summary-panel">
            <h2>项目信息</h2>
            {"coach" in item && <div className="price-line"><span>教练</span><strong>{item.coach}</strong></div>}
            {"time" in item && <div className="price-line"><span>时间</span><strong>{item.time}</strong></div>}
            {"seats" in item && <div className="price-line"><span>剩余名额</span><strong>{item.seats}</strong></div>}
            {"stock" in item && <div className="price-line"><span>库存</span><strong>{item.stock}</strong></div>}
            {"deposit" in item && <div className="price-line"><span>押金</span><strong>¥{item.deposit}</strong></div>}
            <div className="price-line total"><span>价格</span><strong>¥{item.price}</strong></div>
            <Link className="primary-button full" to={paymentUrl}>
              {isCourse ? "去报名支付" : "去租赁支付"}
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}
