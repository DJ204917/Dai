import { ExternalLink, Mail, MapPinned, Navigation, Phone } from "lucide-react";

const amapNavigationUrl = "https://ditu.amap.com/search?query=%E5%9B%9B%E5%B7%9D%E7%9C%81%E6%88%90%E9%83%BD%E5%B8%82%E7%8A%80%E6%B5%A6%E5%9C%B0%E9%93%81%E7%AB%99";
const tencentNavigationUrl = "https://map.qq.com/m/search/searchword=%E5%9B%9B%E5%B7%9D%E7%9C%81%E6%88%90%E9%83%BD%E5%B8%82%E7%8A%80%E6%B5%A6%E5%9C%B0%E9%93%81%E7%AB%99";

function openMapWebsite(url: string) {
  window.location.assign(url);
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
          <p><Phone size={20} /> 18224358955</p>
          <p><Mail size={20} /> 1986144233@qq.com</p>
          <p><MapPinned size={20} /> 四川省成都市犀浦地铁站</p>
          <p><Navigation size={20} /> 点击右侧导航到犀浦地铁站</p>
        </section>
        <section className="map-placeholder navigation-panel">
          <strong>四川省成都市犀浦地铁站</strong>
          <span>请选择地图官网打开路线，进入后可按页面提示继续导航。</span>
          <div className="navigation-actions" aria-label="选择地图官网">
            <button className="primary-button" type="button" onClick={() => openMapWebsite(amapNavigationUrl)}>
              <Navigation size={18} /> 高德地图
            </button>
            <button className="secondary-button" type="button" onClick={() => openMapWebsite(tencentNavigationUrl)}>
              <ExternalLink size={18} /> 腾讯地图
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
