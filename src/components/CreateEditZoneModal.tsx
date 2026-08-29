import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  MapPin,
  Home,
  Briefcase,
  Dumbbell,
  Plane,
  Crosshair,
  Sliders,
  Check,
  Shield,
  Sparkles,
  Info,
} from 'lucide-react';
import { GeoZone, UserLocation, ZoneCategory } from '../types/alarm';
import { formatDistance, LOCATION_PRESETS } from '../utils/locationEngine';

interface CreateEditZoneModalProps {
  zoneToEdit?: GeoZone | null;
  currentUserLocation?: UserLocation | null;
  onSave: (
    zoneData: Omit<GeoZone, 'id' | 'createdTimestamp' | 'updatedTimestamp'> & { id?: string }
  ) => void;
  onClose: () => void;
  isDarkTheme?: boolean;
}

const RADIUS_OPTIONS = [
  { value: 100, label: '100 m', desc: 'Building / Apartment' },
  { value: 250, label: '250 m', desc: 'Standard Neighborhood (Recommended)' },
  { value: 500, label: '500 m', desc: 'Campus / Complex' },
  { value: 1000, label: '1 km', desc: 'District / Airport' },
  { value: 'custom', label: 'Custom', desc: 'Set manual radius' },
];

export const CreateEditZoneModal: React.FC<CreateEditZoneModalProps> = ({
  zoneToEdit,
  currentUserLocation,
  onSave,
  onClose,
  isDarkTheme = true,
}) => {
  const [name, setName] = useState(zoneToEdit ? zoneToEdit.name : 'Home');
  const [category, setCategory] = useState<ZoneCategory>(
    zoneToEdit ? zoneToEdit.category : 'HOME'
  );
  const [latitude, setLatitude] = useState<number>(
    zoneToEdit
      ? zoneToEdit.latitude
      : currentUserLocation?.latitude ?? 17.4435
  );
  const [longitude, setLongitude] = useState<number>(
    zoneToEdit
      ? zoneToEdit.longitude
      : currentUserLocation?.longitude ?? 78.3772
  );
  const [radiusMeters, setRadiusMeters] = useState<number>(
    zoneToEdit ? zoneToEdit.radiusMeters : 250
  );
  const [isCustomRadius, setIsCustomRadius] = useState<boolean>(
    zoneToEdit ? ![100, 250, 500, 1000].includes(zoneToEdit.radiusMeters) : false
  );
  const [address, setAddress] = useState<string>(
    zoneToEdit?.address || 'Hyderabad, Telangana'
  );
  const [isEnabled, setIsEnabled] = useState<boolean>(
    zoneToEdit ? zoneToEdit.isEnabled : true
  );
  const [isLocating, setIsLocating] = useState(false);
  const [locatingMessage, setLocatingMessage] = useState<string | null>(null);

  const handleUseCurrentLocation = () => {
    setIsLocating(true);
    setLocatingMessage('Acquiring high-accuracy location...');

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLatitude(Number(pos.coords.latitude.toFixed(6)));
          setLongitude(Number(pos.coords.longitude.toFixed(6)));
          setAddress(`Current Location (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
          setIsLocating(false);
          setLocatingMessage('Current location acquired!');
          setTimeout(() => setLocatingMessage(null), 2500);
        },
        () => {
          // Fallback to active simulated location
          if (currentUserLocation) {
            setLatitude(currentUserLocation.latitude);
            setLongitude(currentUserLocation.longitude);
            setAddress(currentUserLocation.label || 'Active Device Coordinates');
          } else {
            setLatitude(17.4435);
            setLongitude(78.3772);
            setAddress('Hyderabad (Device Coordinates)');
          }
          setIsLocating(false);
          setLocatingMessage('Location updated from device state.');
          setTimeout(() => setLocatingMessage(null), 2500);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else if (currentUserLocation) {
      setLatitude(currentUserLocation.latitude);
      setLongitude(currentUserLocation.longitude);
      setAddress(currentUserLocation.label || 'Active Device Coordinates');
      setIsLocating(false);
      setLocatingMessage('Location updated from device state.');
      setTimeout(() => setLocatingMessage(null), 2500);
    }
  };

  const handleApplyPreset = (preset: (typeof LOCATION_PRESETS)[0]) => {
    setLatitude(preset.location.latitude);
    setLongitude(preset.location.longitude);
    setAddress(preset.description);
    if (!zoneToEdit) {
      if (preset.label.includes('Home')) {
        setName('Home');
        setCategory('HOME');
        setRadiusMeters(250);
      } else if (preset.label.includes('Office')) {
        setName('Office');
        setCategory('WORK');
        setRadiusMeters(300);
      } else if (preset.label.includes('Gym')) {
        setName('Gym');
        setCategory('GYM');
        setRadiusMeters(150);
      } else if (preset.label.includes('Airport')) {
        setName('Airport');
        setCategory('AIRPORT');
        setRadiusMeters(1000);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...(zoneToEdit?.id ? { id: zoneToEdit.id } : {}),
      name: name.trim(),
      category,
      latitude,
      longitude,
      radiusMeters: Math.max(50, Math.min(10000, radiusMeters)),
      address: address.trim(),
      isEnabled,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="w-full max-h-[92%] sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden select-none"
      >
        {/* Header */}
        <div className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {zoneToEdit ? 'Edit Geo Zone' : 'Create Geo Zone'}
              </h2>
              <p className="text-[11px] text-slate-500">
                Geofenced boundary for location-aware alarms
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {/* Zone Name & Category */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 dark:text-slate-300">
              Zone Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Home, Office, Gym"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />

            {/* Category Selector */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {[
                { id: 'HOME' as ZoneCategory, label: 'Home', icon: Home },
                { id: 'WORK' as ZoneCategory, label: 'Work', icon: Briefcase },
                { id: 'GYM' as ZoneCategory, label: 'Gym', icon: Dumbbell },
                { id: 'AIRPORT' as ZoneCategory, label: 'Airport', icon: Plane },
                { id: 'CUSTOM' as ZoneCategory, label: 'Custom', icon: MapPin },
              ].map((c) => {
                const Icon = c.icon;
                const isSelected = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCategory(c.id);
                      if (!zoneToEdit) setName(c.label);
                    }}
                    className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-medium">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Location Helpers */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Location Coordinates
              </label>
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={isLocating}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Crosshair className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>Use Current Location</span>
              </button>
            </div>

            {locatingMessage && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                ✓ {locatingMessage}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500">Latitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={latitude}
                  onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Longitude</span>
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>

            {/* Quick Presets Carousel */}
            <div className="space-y-1 pt-1">
              <span className="text-[10px] text-slate-500">Presets:</span>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {LOCATION_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-medium whitespace-nowrap border border-slate-200 dark:border-slate-700 hover:border-indigo-400 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Radius Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700 dark:text-slate-300">
                Geofence Radius
              </label>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                {formatDistance(radiusMeters)}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[100, 250, 500, 1000].map((r) => {
                const isSelected = !isCustomRadius && radiusMeters === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRadiusMeters(r);
                      setIsCustomRadius(false);
                    }}
                    className={`py-2 px-1 rounded-xl border text-center font-semibold text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                    }`}
                  >
                    {r < 1000 ? `${r} m` : `${r / 1000} km`}
                  </button>
                );
              })}
            </div>

            {/* Custom Slider / Number Input */}
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Fine-tune radius (50m – 5km)</span>
                <input
                  type="number"
                  min="50"
                  max="10000"
                  step="50"
                  value={radiusMeters}
                  onChange={(e) => {
                    setRadiusMeters(parseInt(e.target.value) || 250);
                    setIsCustomRadius(true);
                  }}
                  className="w-20 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-right font-mono font-bold"
                />
              </div>
              <input
                type="range"
                min="50"
                max="3000"
                step="25"
                value={radiusMeters}
                onChange={(e) => {
                  setRadiusMeters(parseInt(e.target.value));
                  setIsCustomRadius(true);
                }}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-2xl bg-slate-100/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <Shield className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <p>
              <strong>Android Geofence Architecture:</strong> Registered with{' '}
              <code>LocationServices.getGeofencingClient()</code>. The OS evaluates transitions passively with zero battery drain.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md shadow-indigo-600/30 cursor-pointer transition-colors"
            >
              {zoneToEdit ? 'Save Changes' : 'Create Zone'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
