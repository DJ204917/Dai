import { Mail, MapPinned, Navigation, Phone } from "lucide-react";

const xipuNavigationUrl = "https://uri.amap.com/navigation?to=103.976356,30.753039,%E7%8A%80%E6%B5%A6%E5%9C%B0%E9%93%81%E7%AB%99&mode=walk&policy=1&src=chenglan-swim";
const xipuMobileNavigationUrl = "geo:30.753039,103.976356?q=%E5%9B%9B%E5%B7%9D%E7%9C%81%E6%88%90%E9%83%BD%E5%B8%82%E7%8A%80%E6%B5%A6%E5%9C%B0%E9%93%81%E7%AB%99";

function openXipuNavigation() {
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  window.location.href = isMobile ? xipuMobileNavigationUrl : xipuNavigationUrl;
}

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
          <p><MapPinned size={20} /> 四川省成都市犀浦地铁站</p>
          <p><Navigation size={20} /> 点击右侧导航到犀浦地铁站</p>
        </section>
        <section className="map-placeholder navigation-panel">
          <strong>四川省成都市犀浦地铁站</strong>
          <span>手机端会打开系统导航应用选择页，选择高德、百度或其他地图后即可导航。</span>
          <button className="primary-button" type="button" onClick={openXipuNavigation}>
            <Navigation size={18} /> 打开导航
          </button>
        </section>
      </div>
    </div>
  );
}
