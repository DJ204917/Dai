import { ArrowRight, CalendarCheck, CreditCard, ShieldCheck, Store } from "lucide-react";
import { Link } from "react-router-dom";
import { courses, equipment, services } from "../data/mock";

export default function Home() {
  return (
    <div className="page">
      <section className="hero">
        <div className="hero-content">
          <p className="eyebrow">官方预约平台</p>
          <h1>澄蓝泳馆</h1>
          <p>泳道预约、课程报名、装备租赁和在线支付集中处理，让用户少排队，让门店少对账。</p>
          <div className="hero-actions">
            <Link className="primary-button" to="/booking">立即预约 <ArrowRight size={18} /></Link>
            <Link className="secondary-button" to="/rental">租赁装备</Link>
          </div>
        </div>
        <div className="hero-panel">
          <div>
            <span>今日可预约</span>
            <strong>42</strong>
          </div>
          <div>
            <span>热门时段</span>
            <strong>19:00</strong>
          </div>
          <div>
            <span>剩余课程名额</span>
            <strong>18</strong>
          </div>
        </div>
      </section>

      <section className="feature-strip">
        <div><CalendarCheck size={22} /> 7-30 天可预约时段</div>
        <div><CreditCard size={22} /> 微信/支付宝支付预留</div>
        <div><Store size={22} /> 装备库存联动</div>
        <div><ShieldCheck size={22} /> HTTPS 与支付验签规划</div>
      </section>

      <section className="section-grid">
        <div className="section-heading">
          <p className="eyebrow">服务项目</p>
          <h2>核心业务入口</h2>
        </div>
        <div className="card-grid">
          {services.map((service) => (
            <article className="card service-card" key={service.id}>
              <div>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
              </div>
              <div className="service-card-footer">
                <strong>¥{service.price}/{service.unit}</strong>
                <Link className="primary-button service-action" to={`/payment?service=${service.id}`}>
                  去支付 <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="two-column">
        <div>
          <p className="eyebrow">课程</p>
          <h2>近期可约课程</h2>
          <div className="list-panel">
            {courses.map((course) => (
              <div className="list-row" key={course.id}>
                <div>
                  <strong>{course.title}</strong>
                  <span>{course.coach} · {course.time}</span>
                </div>
                <div className="row-actions">
                  <b>余 {course.seats}</b>
                  <Link className="detail-button" to={`/details/course/${course.id}`}>详情</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow">租赁</p>
          <h2>高频租赁装备</h2>
          <div className="list-panel">
            {equipment.slice(0, 3).map((item) => (
              <div className="list-row" key={item.id}>
                <div>
                  <strong>{item.name}</strong>
                  <span>租金 ¥{item.price} · 押金 ¥{item.deposit}</span>
                </div>
                <div className="row-actions">
                  <b>库存 {item.stock}</b>
                  <Link className="detail-button" to={`/details/equipment/${item.id}`}>详情</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
