import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QrCode, Upload, ImageOff, Loader2, Save, AlertTriangle, X } from 'lucide-react';
import apiService from '../../services/APIservices';

export const PAYMENT_CHANNELS = ['GCash', 'Maya', 'Bank Transfer', 'Others'];

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png'];
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'];
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB
const SQUARE_TOLERANCE = 0.05; // 5% na pagkakaiba ng width/height

const cleanNumber = (value) => (value || '').replace(/[\s-]+/g, '');

/** Ibinabalik ang error message (string) o null kung valid. */
export const validateQRFile = (file) => {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIME_TYPES.includes(file.type)) {
    return 'Only JPG, JPEG, or PNG images are allowed.';
  }
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `This file is ${mb}MB. The maximum allowed size is 2MB.`;
  }
  return null;
};

const validateAccountNumber = (channel, raw) => {
  const value = cleanNumber(raw);
  if (!value) return 'Mobile / account number is required.';
  if (channel === 'GCash' || channel === 'Maya') {
    if (!/^(09\d{9}|\+639\d{9})$/.test(value)) {
      return 'Enter a valid mobile number, e.g. 09171234567.';
    }
    return null;
  }
  if (!/^[0-9]{6,25}$/.test(value)) {
    return 'Enter a valid account number (6-25 digits).';
  }
  return null;
};

/**
 * PAYMENT SETTINGS
 *
 * Iisang QR code (qr_code_url) + fallback details (channel, account
 * name, account number). Ang image ay ina-upload lang pagka-click ng
 * "Save Payment Details" — hindi agad-agad — para hindi mag-iwan ng
 * ulilang files sa storage kung magbago ang isip ng user.
 *
 * Props:
 *   initial  — { qr_code_url, payment_channel, payment_account_name, payment_account_number }
 *   shopId   — para sa storage path
 *   onSaved  — (savedValues) => void
 *   onNotify — ({ type, title, message }) => void  (toast ng parent)
 */
const PaymentSettings = ({ initial, shopId, onSaved, onNotify }) => {
  const inputRef = useRef(null);

  const [channel, setChannel] = useState(initial?.payment_channel || 'GCash');
  const [accountName, setAccountName] = useState(initial?.payment_account_name || '');
  const [accountNumber, setAccountNumber] = useState(initial?.payment_account_number || '');
  const [savedQrUrl, setSavedQrUrl] = useState(initial?.qr_code_url || '');

  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreview, setPendingPreview] = useState('');
  const [fileError, setFileError] = useState('');
  const [aspectWarning, setAspectWarning] = useState('');
  const [previewFailed, setPreviewFailed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Sync kapag dumating ang data galing backend (pagkatapos ng fetchAll)
  useEffect(() => {
    setChannel(initial?.payment_channel || 'GCash');
    setAccountName(initial?.payment_account_name || '');
    setAccountNumber(initial?.payment_account_number || '');
    setSavedQrUrl(initial?.qr_code_url || '');
  }, [
    initial?.payment_channel,
    initial?.payment_account_name,
    initial?.payment_account_number,
    initial?.qr_code_url,
  ]);

  // Linisin ang object URL para walang memory leak
  useEffect(() => {
    return () => {
      if (pendingPreview) URL.revokeObjectURL(pendingPreview);
    };
  }, [pendingPreview]);

  const displayUrl = pendingPreview || savedQrUrl;

  const clearPending = useCallback(() => {
    setPendingFile(null);
    setPendingPreview('');
    setAspectWarning('');
    setFileError('');
    setPreviewFailed(false);
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;

    const problem = validateQRFile(file);
    if (problem) {
      setFileError(problem);
      return;
    }

    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      const ratioGap = Math.abs(probe.width - probe.height) / Math.max(probe.width, probe.height);
      setAspectWarning(
        ratioGap > SQUARE_TOLERANCE
          ? `This image is ${probe.width}×${probe.height}px — not a square. It will be shown fully inside a square box, but a square screenshot with a white border around the QR scans best.`
          : ''
      );
    };
    probe.onerror = () => setAspectWarning('');
    probe.src = url;

    setFileError('');
    setPreviewFailed(false);
    setPendingFile(file);
    setPendingPreview(url);
    setErrors((prev) => ({ ...prev, qr: undefined }));
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const onInputChange = (e) => {
    handleFile(e.target.files?.[0]);
    e.target.value = '';
  };

  const validateAll = () => {
    const next = {};
    if (!pendingFile && !savedQrUrl) next.qr = 'Please upload your QR code image.';
    if (!channel) next.channel = 'Please select a payment channel.';
    if (!accountName.trim()) next.accountName = 'Account / merchant name is required.';
    else if (accountName.trim().length > 100) next.accountName = 'Name must be 100 characters or fewer.';
    const numberError = validateAccountNumber(channel, accountNumber);
    if (numberError) next.accountNumber = numberError;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validateAll()) return;

    try {
      setIsSaving(true);

      let qrUrl = savedQrUrl;
      if (pendingFile) {
        qrUrl = await apiService.uploadPaymentQR(pendingFile, shopId, 'qr');
      }

      const payload = {
        qr_code_url: qrUrl,
        payment_channel: channel,
        payment_account_name: accountName.trim(),
        payment_account_number: cleanNumber(accountNumber),
        accepts_online: true, // nag-set ng QR = gusto mag-enable ng Online Payment
      };

      await apiService.updateShopProfile(shopId, payload);

      setSavedQrUrl(qrUrl);
      clearPending();
      onSaved?.(payload);
      onNotify?.({
        type: 'success',
        title: 'Payment Details Saved',
        message: 'Customers will now see your QR code and account details.',
      });
    } catch (error) {
      const detail = error?.response?.data?.detail;
      const message = Array.isArray(detail)
        ? detail.map((d) => d?.msg).filter(Boolean).join(' | ')
        : (typeof detail === 'string' ? detail : error?.message) || 'Could not save payment details.';
      onNotify?.({ type: 'error', title: 'Save Failed', message });
    } finally {
      setIsSaving(false);
    }
  };

  const fieldClass = (hasError) =>
    `w-full bg-white border-2 rounded-2xl px-5 py-3.5 font-bold text-slate-700 outline-none transition-all focus:ring-4 ${
      hasError ? 'border-rose-300 ring-rose-50' : 'border-slate-100 ring-sky-50 focus:border-sky-200'
    }`;

  return (
    <div className="mt-6 p-8 bg-sky-50/40 rounded-[36px] border-2 border-sky-100">
      <div className="flex items-center gap-2 mb-1">
        <QrCode size={16} className="text-sky-500" />
        <p className="text-[11px] font-black text-sky-700 uppercase tracking-[0.2em]">Payment QR & Account Details</p>
      </div>
      <p className="text-xs text-slate-400 font-bold mb-6">
        Upload one QR code that customers will scan, then add your account details as a backup in case the QR can't be scanned or loaded.
      </p>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* LEFT — uploader + preview */}
        <div className="flex flex-col items-center gap-4 lg:w-72 shrink-0">
          <div
            role="button"
            tabIndex={0}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`relative w-full aspect-square rounded-[28px] border-2 border-dashed bg-white overflow-hidden cursor-pointer flex items-center justify-center transition-all ${
              isDragging ? 'border-sky-400 bg-sky-50' : errors.qr ? 'border-rose-300' : 'border-slate-200 hover:border-sky-300'
            }`}
          >
            {displayUrl && !previewFailed ? (
              <img
                src={displayUrl}
                alt="Payment QR code preview"
                onError={() => setPreviewFailed(true)}
                className="w-full h-full object-contain p-2"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-300 px-6 text-center">
                {previewFailed ? <ImageOff size={32} /> : <Upload size={32} />}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {previewFailed ? 'Image failed to load' : 'Drag & drop or click to upload'}
                </span>
                <span className="text-[9px] font-bold normal-case">JPG, JPEG or PNG · max 2MB</span>
              </div>
            )}

            {pendingFile && (
              <span className="absolute top-3 left-3 bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
                Not saved yet
              </span>
            )}
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={onInputChange}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[11px] text-white bg-sky-600 hover:bg-sky-500 shadow-lg shadow-sky-100 transition-all active:scale-95 disabled:opacity-60"
            >
              <Upload size={14} />
              {displayUrl ? 'Replace QR Code' : 'Upload QR Code'}
            </button>
            {pendingFile && (
              <button
                type="button"
                onClick={clearPending}
                disabled={isSaving}
                className="p-3 rounded-2xl bg-white text-slate-400 hover:text-rose-500 border-2 border-slate-100 transition-all"
                title="Discard selected image"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {errors.qr && <p className="text-[11px] font-bold text-rose-500 text-center">{errors.qr}</p>}
          {fileError && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 w-full">
              <AlertTriangle size={14} className="text-rose-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-rose-600">{fileError}</p>
            </div>
          )}
          {aspectWarning && !fileError && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 w-full">
              <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
              <p className="text-[11px] font-bold text-amber-700">{aspectWarning}</p>
            </div>
          )}
        </div>

        {/* RIGHT — fallback fields */}
        <div className="flex-1 space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Channel</label>
            <select
              value={channel}
              onChange={(e) => { setChannel(e.target.value); setErrors((p) => ({ ...p, channel: undefined, accountNumber: undefined })); }}
              className={`${fieldClass(errors.channel)} cursor-pointer`}
            >
              {PAYMENT_CHANNELS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            {errors.channel && <p className="text-[11px] font-bold text-rose-500 ml-1">{errors.channel}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account / Merchant Name</label>
            <input
              value={accountName}
              maxLength={100}
              onChange={(e) => { setAccountName(e.target.value); setErrors((p) => ({ ...p, accountName: undefined })); }}
              placeholder="e.g. Juan's Milk Tea Shop"
              className={fieldClass(errors.accountName)}
            />
            {errors.accountName && <p className="text-[11px] font-bold text-rose-500 ml-1">{errors.accountName}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile / Account Number</label>
            <input
              value={accountNumber}
              inputMode="tel"
              maxLength={30}
              onChange={(e) => { setAccountNumber(e.target.value); setErrors((p) => ({ ...p, accountNumber: undefined })); }}
              placeholder={channel === 'GCash' || channel === 'Maya' ? 'e.g. 09171234567' : 'e.g. 1234567890'}
              className={fieldClass(errors.accountNumber)}
            />
            {errors.accountNumber && <p className="text-[11px] font-bold text-rose-500 ml-1">{errors.accountNumber}</p>}
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-emerald-100 transition-all active:scale-95 disabled:opacity-60"
            >
              {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              {isSaving ? 'Saving...' : 'Save Payment Details'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSettings;