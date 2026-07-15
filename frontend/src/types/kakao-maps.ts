export type KakaoLatLng = {
  getLat: () => number;
  getLng: () => number;
};

export type KakaoMap = {
  setCenter: (position: KakaoLatLng) => void;
  setLevel: (level: number) => void;
  setBounds: (bounds: KakaoLatLngBounds) => void;
  relayout: () => void;
};

export type KakaoLatLngBounds = {
  extend: (position: KakaoLatLng) => void;
};

export type KakaoCustomOverlay = {
  setMap: (map: KakaoMap | null) => void;
};

export type KakaoMarker = {
  setMap: (map: KakaoMap | null) => void;
};

export type KakaoRegionResult = {
  address_name: string;
  code: string;
  region_type: "B" | "H";
};

export type KakaoGeocoder = {
  coord2RegionCode: (
    longitude: number,
    latitude: number,
    callback: (result: KakaoRegionResult[], status: string) => void,
  ) => void;
};

export type KakaoMaps = {
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoLatLngBounds;
  Map: new (
    container: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMap;
  Marker: new (options: {
    map: KakaoMap;
    position: KakaoLatLng;
    title: string;
  }) => KakaoMarker;
  CustomOverlay: new (options: {
    map: KakaoMap;
    position: KakaoLatLng;
    content: string | HTMLElement;
    yAnchor: number;
    zIndex?: number;
  }) => KakaoCustomOverlay;
  event: {
    addListener: (
      target: KakaoMap,
      eventName: "click",
      callback: (event: { latLng: KakaoLatLng }) => void,
    ) => void;
    removeListener: (
      target: KakaoMap,
      eventName: "click",
      callback: (event: { latLng: KakaoLatLng }) => void,
    ) => void;
  };
  services?: {
    Geocoder: new () => KakaoGeocoder;
    Status: { OK: string };
  };
  load: (callback: () => void) => void;
};

declare global {
  interface Window {
    kakao?: {
      maps: KakaoMaps;
    };
  }
}
