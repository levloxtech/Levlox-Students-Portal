export function getDeviceId() {
  let id = localStorage.getItem("levlox_device_id");
  if (!id) {
    // Generate simple UUIDv4
    id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
    localStorage.setItem("levlox_device_id", id);
  }
  return id;
}

export function getDeviceType() {
  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|Windows Phone|webOS/i.test(ua);
  return isMobile ? "mobile" : "desktop";
}

export function getDeviceLabel() {
  const ua = navigator.userAgent;
  // Make a simple pretty label
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android Device";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows PC";
  if (/Linux/i.test(ua)) return "Linux PC";
  return "Unknown Device";
}
