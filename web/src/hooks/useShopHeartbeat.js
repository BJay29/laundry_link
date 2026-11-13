import { useEffect } from 'react';
import apiService from '../services/APIservices';

/**
 * SHOP HEARTBEAT
 *
 * Nagpapadala ng "buhay pa ang terminal" signal sa backend bawat 60
 * segundo (at agad kapag bumalik ang tab sa foreground o bumalik ang
 * internet). Tumatanggap ang backend ng grace period na 3 minuto, kaya
 * hindi agad magsasara ang shop kapag sandaling naputol ang koneksyon.
 *
 * IMPORTANTE: tawagin ito SA APP SHELL/LAYOUT (ang component na nakikita
 * sa lahat ng page pagkatapos mag-login), hindi sa isang page lang —
 * kung hindi, titigil ang heartbeat kapag lumipat ng page ang staff at
 * magmumukhang offline ang shop.
 */
const INTERVAL_MS = 60_000;

const useShopHeartbeat = (enabled = true) => {
  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const beat = async () => {
      // Walang token sa localStorage (Supabase session ang gamit) — ang
      // naka-cache na shop_id ang palatandaan na naka-login na ang staff.
      if (cancelled || !localStorage.getItem('shop_id')) return;
      try {
        await apiService.sendShopHeartbeat();
      } catch {
        // Tahimik — susubukan ulit sa susunod na tick.
      }
    };

    beat();
    const timer = setInterval(beat, INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') beat();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', beat);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', beat);
    };
  }, [enabled]);
};

export default useShopHeartbeat;