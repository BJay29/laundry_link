import React, { useState, useEffect, useCallback } from 'react';
import { Star, RefreshCw, MessageSquare, X, AlertCircle } from 'lucide-react';
import apiService from '../services/APIservices';
import LoadingScreen from '../components/ui/loadingscreen';

/**
 * REVIEWS PAGE (NEW — Rating after order)
 *
 * Nagpapakita sa may-ari/staff ng mga rating at komento na ibinigay ng
 * customers (mobile app) sa SARILING shop — pagkatapos maging "Claimed"
 * ang order. Kinukuha mula sa GET /reviews/shop (naka-scope sa shop ng
 * naka-login, galing sa JWT).
 *
 *  - Buod: average na bituin at kabuuang bilang ng ratings.
 *  - Distribution: ilan ang 5★ hanggang 1★. I-click ang isang hanay para
 *    i-filter ang listahan sa bituing iyon; i-click ulit para alisin.
 *  - Listahan: pinakabago muna, may unang pangalan ng customer (privacy —
 *    walang buong pangalan o contact), serbisyo, petsa, at komento.
 */

const STAR_LEVELS = [5, 4, 3, 2, 1];

const Stars = ({ rating, size = 16 }) => (
  <div className="inline-flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        size={size}
        strokeWidth={2}
        className={n <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}
      />
    ))}
  </div>
);

const formatDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const Reviews = () => {
  const [summary, setSummary] = useState({ average_rating: null, rating_count: 0, distribution: {} });
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [starFilter, setStarFilter] = useState(null);

  const loadReviews = useCallback(async (isRefresh = false) => {
    try {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setError('');
      const data = await apiService.getShopReviews(200);
      setSummary(data?.summary || { average_rating: null, rating_count: 0, distribution: {} });
      setReviews(data?.reviews || []);
    } catch (err) {
      console.error('Reviews fetch failed:', err);
      setError('Could not load your reviews. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  if (loading) return <LoadingScreen message="Loading Reviews..." />;

  const total = summary.rating_count || 0;
  const average = summary.average_rating;
  const visibleReviews = starFilter ? reviews.filter((r) => r.rating === starFilter) : reviews;

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-10 font-sans">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-500 mb-1">
            <Star size={16} className="fill-amber-400" />
            <span className="text-[10px] font-black uppercase tracking-widest">Customer Feedback</span>
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter italic uppercase">Reviews</h1>
          <p className="text-slate-500 font-bold text-sm mt-2">
            What customers say after their order is completed.
          </p>
        </div>
        <button
          onClick={() => loadReviews(true)}
          className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all shadow-sm active:scale-95"
        >
          <RefreshCw size={20} className={refreshing ? 'animate-spin text-sky-500' : 'text-slate-400'} />
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-center gap-4 text-rose-600 font-bold">
          <AlertCircle size={24} />
          {error}
        </div>
      )}

      {/* SUMMARY + DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">Average Rating</p>
          <p className="text-7xl font-black text-slate-900 tracking-tighter">
            {total > 0 && average !== null ? average.toFixed(1) : '—'}
          </p>
          <div className="mt-3">
            <Stars rating={Math.round(average || 0)} size={22} />
          </div>
          <p className="text-xs font-bold text-slate-400 mt-3">
            {total > 0 ? `Based on ${total} ${total === 1 ? 'review' : 'reviews'}` : 'No ratings yet'}
          </p>
        </div>

        <div className="lg:col-span-2 bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Rating Breakdown</h2>
            {starFilter && (
              <button
                onClick={() => setStarFilter(null)}
                className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-sky-100 transition-all"
              >
                <X size={12} /> Clear filter
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {STAR_LEVELS.map((level) => {
              const count = summary.distribution?.[String(level)] || 0;
              const percent = total > 0 ? (count / total) * 100 : 0;
              const isActive = starFilter === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setStarFilter((prev) => (prev === level ? null : level))}
                  disabled={count === 0}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-2xl border transition-all text-left ${
                    isActive
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-white border-transparent hover:bg-slate-50 disabled:hover:bg-white'
                  } ${count === 0 ? 'opacity-50 cursor-default' : 'cursor-pointer'}`}
                >
                  <span className="flex items-center gap-1 w-10 shrink-0 text-xs font-black text-slate-600">
                    {level}
                    <Star size={12} className="text-amber-400 fill-amber-400" />
                  </span>
                  <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-black text-slate-500">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* REVIEW LIST */}
      <div className="bg-white p-10 rounded-[56px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-xl">
            <MessageSquare size={16} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {starFilter ? `${starFilter}-star reviews` : 'All reviews'}
          </h2>
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-black">
            {visibleReviews.length}
          </span>
        </div>

        {visibleReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-300 font-black uppercase text-xs tracking-widest text-center">
            {total === 0
              ? 'No reviews yet. Ratings appear here after customers claim their orders.'
              : 'No reviews match this filter.'}
          </div>
        ) : (
          <div className="space-y-4">
            {visibleReviews.map((review) => (
              <div
                key={review.id}
                className="p-6 bg-slate-50/60 rounded-3xl border border-slate-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center font-black text-sm uppercase">
                      {(review.customer_first_name || 'C').charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {review.customer_first_name || 'Customer'}
                      </p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {review.service_type || 'Order'} · {formatDate(review.created_at)}
                      </p>
                    </div>
                  </div>
                  <Stars rating={review.rating} size={16} />
                </div>

                {review.comment && (
                  <p className="mt-4 text-sm text-slate-600 font-medium leading-relaxed bg-white rounded-2xl border border-slate-100 px-4 py-3 break-words">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reviews;
