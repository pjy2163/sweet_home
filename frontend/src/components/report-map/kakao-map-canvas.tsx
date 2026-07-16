import Script from "next/script";
import { type ReactNode, useEffect, useRef, useState } from "react";

import { formatNumber, formatRatio } from "@/lib/format";
import type {
  KakaoCustomOverlay,
  KakaoLatLng,
  KakaoMap,
  KakaoMarker,
} from "@/types/kakao-maps";
import type { HeatmapLevel } from "@/types/sweethome";

import { MAP_SIZE_CLASS, type MapSize } from "./map-size-control";
import type { CandidateState, ReportRegion } from "./types";

type KakaoMapCanvasProps = {
  appKey: string;
  candidateStates: Record<string, CandidateState>;
  children: ReactNode;
  label: string;
  mapResetVersion: number;
  mapSize: MapSize;
  regions: ReportRegion[];
  unit: string;
  onAnalyzeRegion: (regionId: string, addressName: string) => Promise<void>;
  onNoticeChange: (notice: {
    tone: "guide" | "loading" | "success" | "error";
    text: string;
  }) => void;
  onOpenRegion: (region: ReportRegion) => void;
};

const OVERLAY_COLORS: Record<
  HeatmapLevel,
  { bg: string; text: string; border: string }
> = {
  very_high: { bg: "#847dff", text: "#fff", border: "#6c65e0" },
  high: { bg: "#00b3dd", text: "#fff", border: "#0090b2" },
  medium: { bg: "#3f4041", text: "#cacaca", border: "#5a5b5c" },
  low: { bg: "#252829", text: "#9f9fa0", border: "#3a3b3c" },
  very_low: { bg: "#191b1c", text: "#6a6b6b", border: "#2a2b2c" },
  no_data: { bg: "#191b1c", text: "#6a6b6b", border: "#2a2b2c" },
};

export function KakaoMapCanvas({
  appKey,
  candidateStates,
  children,
  label,
  mapResetVersion,
  mapSize,
  regions,
  unit,
  onAnalyzeRegion,
  onNoticeChange,
  onOpenRegion,
}: KakaoMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    let disposed = false;
    let map: KakaoMap | null = null;
    const clickMarkers: KakaoMarker[] = [];
    let clickHandler: ((event: { latLng: KakaoLatLng }) => void) | null = null;
    const overlays: KakaoCustomOverlay[] = [];

    function drawMap() {
      if (disposed || !window.kakao?.maps || !mapRef.current) return;

      const maps = window.kakao.maps;
      const centerRegion = regions[0];
      const center = new maps.LatLng(
        centerRegion?.centroid_lat ?? 37.5665,
        centerRegion?.centroid_lon ?? 126.978,
      );
      map = new maps.Map(mapRef.current, { center, level: 8 });
      const bounds = new maps.LatLngBounds();
      const services = maps.services;
      const geocoder = services ? new services.Geocoder() : null;

      if (!geocoder || !services) {
        onNoticeChange({
          tone: "error",
          text: "위치 분석 라이브러리를 불러오지 못했습니다. 페이지를 새로고침해 주세요.",
        });
      } else {
        clickHandler = ({ latLng }) => {
          if (!map || disposed) return;
          const marker = new maps.Marker({
            map,
            position: latLng,
            title: "분석할 위치",
          });
          clickMarkers.push(marker);
          if (clickMarkers.length > 2) {
            clickMarkers.shift()?.setMap(null);
          }
          onNoticeChange({
            tone: "loading",
            text: "클릭한 위치의 행정동을 확인하는 중입니다.",
          });
          geocoder.coord2RegionCode(
            latLng.getLng(),
            latLng.getLat(),
            (result, status) => {
              if (disposed) return;
              if (status !== services.Status.OK) {
                onNoticeChange({
                  tone: "error",
                  text: "클릭한 위치의 행정동을 확인하지 못했습니다.",
                });
                return;
              }

              const administrativeRegion = result.find(
                (region) => region.region_type === "H",
              );
              if (!administrativeRegion) {
                onNoticeChange({
                  tone: "error",
                  text: "이 위치에서는 행정동 정보를 찾을 수 없습니다.",
                });
                return;
              }

              void onAnalyzeRegion(
                administrativeRegion.code,
                administrativeRegion.address_name,
              );
            },
          );
        };
        maps.event.addListener(map, "click", clickHandler);
      }

      regions.forEach((region, index) => {
        if (region.centroid_lat === null || region.centroid_lon === null || !map) {
          return;
        }

        const position = new maps.LatLng(region.centroid_lat, region.centroid_lon);
        bounds.extend(position);
        const content = createOverlayElement({
          candidateState: candidateStates[region.region_id],
          index,
          region,
          total: regions.length,
          unit,
          onOpenRegion,
        });
        overlays.push(
          new maps.CustomOverlay({
            map,
            position,
            content,
            yAnchor: 1.3,
            zIndex: regions.length - index,
          }),
        );
      });

      if (regions.length > 1) {
        map.setBounds(bounds);
      } else {
        map.setCenter(center);
        map.setLevel(regions.length === 1 ? 7 : 8);
      }
      map.relayout();
    }

    window.kakao?.maps.load(drawMap);
    return () => {
      disposed = true;
      overlays.forEach((overlay) => overlay.setMap(null));
      clickMarkers.forEach((marker) => marker.setMap(null));
      if (map && clickHandler && window.kakao?.maps) {
        window.kakao.maps.event.removeListener(map, "click", clickHandler);
      }
    };
  }, [
    candidateStates,
    mapReady,
    mapResetVersion,
    mapSize,
    onAnalyzeRegion,
    onNoticeChange,
    onOpenRegion,
    regions,
    unit,
  ]);

  return (
    <>
      <Script
        onError={() => setMapReady(false)}
        onReady={() => setMapReady(true)}
        src={`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${appKey}&autoload=false&libraries=services`}
        strategy="afterInteractive"
      />
      <div
        className={`relative ${MAP_SIZE_CLASS[mapSize]} overflow-hidden rounded-2xl border border-white/10 bg-[#0f1011]`}
      >
        <div className="absolute inset-0" ref={mapRef} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,10,11,0.10),rgba(9,10,11,0.22))]" />
        <div className="absolute left-5 top-5 rounded-lg border border-white/10 bg-black/45 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#cacaca] backdrop-blur">
          {label}
        </div>
        {children}
      </div>
    </>
  );
}

function createOverlayElement({
  candidateState,
  index,
  region,
  total,
  unit,
  onOpenRegion,
}: {
  candidateState?: CandidateState;
  index: number;
  region: ReportRegion;
  total: number;
  unit: string;
  onOpenRegion: (region: ReportRegion) => void;
}) {
  const metricColor = OVERLAY_COLORS[region.level] ?? OVERLAY_COLORS.medium;
  const color = metricColor;
  const stateBorder = candidateState === "saved"
    ? "#1888e8"
    : candidateState === "excluded"
      ? "#858c97"
      : color.border;
  const scale = index === 0 ? 1.25 : index <= 2 ? 1.05 : 0.9;
  const fontSize = Math.round(13 * scale);
  const rank = index + 1;
  const button = document.createElement("button");
  button.type = "button";
  button.dataset.reportRegionId = region.region_id;
  button.style.background = color.bg;
  button.style.color = color.text;
  button.style.border = `${candidateState ? 3 : 1.5}px solid ${stateBorder}`;
  button.style.borderRadius = "999px";
  button.style.padding = index === 0 ? "8px 14px" : "6px 11px";
  button.style.fontSize = `${fontSize}px`;
  button.style.fontWeight = "700";
  button.style.fontFamily = "var(--font-noto-sans-kr), sans-serif";
  button.style.whiteSpace = "nowrap";
  button.style.boxShadow = "0 4px 16px rgba(0,0,0,0.45)";
  button.style.cursor = "pointer";
  button.style.lineHeight = "1.3";
  button.style.transition = "transform 0.12s, box-shadow 0.12s";
  button.style.opacity = candidateState === "excluded" ? "0.58" : "1";

  const badgeText = candidateState === "saved"
    ? "★"
    : candidateState === "excluded"
      ? "×"
      : rank <= 3 ? String(rank) : "";
  if (badgeText) {
    const badge = document.createElement("span");
    badge.textContent = badgeText;
    badge.style.display = "inline-block";
    badge.style.marginRight = "5px";
    badge.style.fontSize = candidateState ? "10px" : "9px";
    if (candidateState) {
      badge.style.background = candidateState === "saved" ? "#1888e8" : "#858c97";
      badge.style.color = "#fff";
      badge.style.borderRadius = "99px";
      badge.style.padding = "1px 5px";
    } else {
      badge.style.background = color.text;
      badge.style.color = color.bg;
      badge.style.borderRadius = "99px";
      badge.style.fontWeight = "800";
      badge.style.padding = "1px 5px";
      badge.style.lineHeight = "1.4";
    }
    button.append(badge);
  }

  button.append(document.createTextNode(region.dong_name));
  const value = document.createElement("span");
  value.textContent = formatRegionValue(region, unit);
  value.style.marginLeft = "5px";
  value.style.fontSize = `${fontSize - 2}px`;
  value.style.fontWeight = "400";
  value.style.opacity = "0.8";
  button.append(value);

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onOpenRegion(region);
  });
  ["mousedown", "mouseup", "pointerdown", "pointerup"].forEach((eventName) => {
    button.addEventListener(eventName, (event) => event.stopPropagation());
  });
  button.addEventListener("mouseenter", () => {
    button.style.transform = "scale(1.1)";
    button.style.boxShadow = "0 8px 28px rgba(0,0,0,0.65)";
    if (button.parentElement) button.parentElement.style.zIndex = "9999";
  });
  button.addEventListener("mouseleave", () => {
    button.style.transform = "scale(1)";
    button.style.boxShadow = "0 4px 16px rgba(0,0,0,0.45)";
    if (button.parentElement) button.parentElement.style.zIndex = String(total - index);
  });

  return button;
}

function formatRegionValue(region: ReportRegion, unit: string) {
  if (region.value === null) return "데이터 없음";
  return unit === "%"
    ? formatRatio(region.value)
    : formatNumber(region.value, unit);
}
