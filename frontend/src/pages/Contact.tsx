import { Mail, MapPinned, Navigation, Phone } from "lucide-react";

export default function Contact() {
  return (
    <div className="page compact-page">
      <section className="section-heading">
        <p className="eyebrow">联系我们</p>
        <h1>门店电话、地图与交通指南</h1>
      </section>
      <div className="two-column">
        <section className="panel contact-list">
          <p><Phone size={20} /> 400-800-6688</p>
          <p><Mail size={20} /> service@chenglan-swim.example</p>
          <p><MapPinned size={20} /> 上海市浦东新区蓝湾路 88 号</p>
          <p><Navigation size={20} /> 地铁 2 号线蓝湾站 3 号口步行 600 米</p>
        </section>
        <section className="map-placeholder">
          <strong>高德/百度地图嵌入区域</strong>
          <span>上线时替换为门店坐标和一键导航链接</span>
        </section>
      </div>
    </div>
  );
}
