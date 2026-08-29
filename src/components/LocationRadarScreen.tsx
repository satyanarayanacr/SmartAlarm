import React from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  MapPin,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Navigation,
  Sparkles,
  Zap,
  Activity,
  Layers,
  BatteryCharging,
  Info,
} from 'lucide-react';
import { GeoZone, SystemPermissions, UserLocation } from '../types/alarm';
import { calculateDistanceMeters, formatDistance, LOCATION_PRESETS } from '../utils/locationEngine';

interface LocationRadarScreenProps {
  userLocation: UserLocation | null;
  zones: GeoZone[];
  permissions: SystemPermissions;
  onSetLocationPreset: (preset: (typeof LOCATION_PRESETS)[0]) => void;
  onTogglePermission: (key: keyof SystemPermissions) => void;
  onRequestLiveGps: () => void;
  isDarkTheme?: boolean;
}

export const LocationRadarScreen: React.FC<LocationRadarScreenProps> = ({
  userLocation,
  zones,
  permissions,
  onSetLocationPreset,
  onTogglePermission,
  onRequestLiveGps,
  isDarkTheme = true,
}) => {
  const isLocationAvailable =
    permissions.locationServicesEnabled &&
    (permissions.fineLocationGranted || permissions.coarseLocationGranted) &&
    userLocation !== null;

  return (
    <div className="h-full flex flex-col justify-between overflow-hidden relative select-none">
      {/* Top Header */}
      <div className="p-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-indigo-500 animate-pulse" />
              Location Status
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Geofence radar & simulated location manager
            </p>
          </div>

          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1.5 ${
              isLocationAvailable
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLocationAvailable ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'
              }`}
            />
            {isLocationAvailable ? 'GPS ACTIVE' : 'GPS UNKNOWN'}
          </span>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Active Coordinates Card */}
        <div className="p-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-indigo-800 text-white shadow-lg shadow-indigo-600/20 space-y-3 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-28 h-28 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold tracking-wider text-indigo-200 uppercase flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5" />
              Current Device Fix
            </span>
            <span className="text-[10px] font-mono bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm">
              Source: {userLocation?.source || 'SIMULATED'}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">
              {userLocation?.label || 'Custom Device Coordinates'}
            </h3>
            <p className="text-xs font-mono text-indigo-100/90 mt-1">
              {userLocation
                ? `LAT: ${userLocation.latitude.toFixed(5)}° N • LON: ${userLocation.longitude.toFixed(5)}° E`
                : 'No GPS fix acquired (UNKNOWN)'}
            </p>
          </div>

          <div className="pt-1 flex items-center justify-between text-[11px] text-indigo-100 border-t border-white/15">
            <span>Accuracy: ±{userLocation?.accuracy || 15} meters</span>
            <button
              onClick={onRequestLiveGps}
              className="text-[11px] underline font-semibold hover:text-white cursor-pointer"
            >
              Acquire Live Browser GPS
            </button>
          </div>
        </div>

        {/* Quick Location Jump Simulator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Simulate Device Location
            </h3>
            <span className="text-[10px] text-slate-500">Test alarm triggers without moving</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {LOCATION_PRESETS.map((preset, idx) => {
              const isCurrent =
                userLocation?.latitude === preset.location.latitude &&
                userLocation?.longitude === preset.location.longitude;

              return (
                <button
                  key={idx}
                  onClick={() => onSetLocationPreset(preset)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                  }`}
                >
                  <p className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>{preset.label}</span>
                    {isCurrent && (
                      <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Real-time Zone Detection Status */}
        <div className="space-y-2">
          <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-indigo-500" />
            Detected Geofence States
          </h3>

          <div className="space-y-2">
            {zones.map((zone) => {
              if (!isLocationAvailable) {
                return (
                  <div
                    key={zone.id}
                    className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{zone.name}</p>
                      <p className="text-[10px] text-slate-500">Radius: {formatDistance(zone.radiusMeters)}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      UNKNOWN
                    </span>
                  </div>
                );
              }

              const distance = calculateDistanceMeters(
                userLocation!.latitude,
                userLocation!.longitude,
                zone.latitude,
                zone.longitude
              );
              const isInside = distance <= zone.radiusMeters;

              return (
                <div
                  key={zone.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    isInside
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        isInside ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-400'
                      }`}
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{zone.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {formatDistance(distance)} away • Radius: {formatDistance(zone.radiusMeters)}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      isInside
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {isInside ? 'INSIDE ZONE' : 'OUTSIDE ZONE'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Android Geofence Privacy & Reliability */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2 text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold text-xs">
            <BatteryCharging className="w-4 h-4 text-emerald-500" />
            Zero-Polling Battery Architecture
          </div>
          <p>
            Smart Alarm uses Google Play Services <code>GeofencingClient</code> instead of continuously running GPS.
            Hardware geofences are evaluated passively by cell towers and Wi-Fi beacons with minimal energy impact.
          </p>
        </div>
      </div>
    </div>
  );
};
