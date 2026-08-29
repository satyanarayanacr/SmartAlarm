import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  Home,
  Briefcase,
  Dumbbell,
  Plane,
  Plus,
  Compass,
  Check,
  Trash2,
  Edit2,
  Shield,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { GeoZone, SystemPermissions, UserLocation, ZoneCategory } from '../types/alarm';
import { calculateDistanceMeters, formatDistance } from '../utils/locationEngine';

interface ZoneListScreenProps {
  zones: GeoZone[];
  userLocation: UserLocation | null;
  permissions: SystemPermissions;
  onAddZone: () => void;
  onEditZone: (zone: GeoZone) => void;
  onDeleteZone: (zoneId: string) => void;
  onToggleZone: (zoneId: string, isEnabled: boolean) => void;
  isDarkTheme?: boolean;
}

export const ZoneListScreen: React.FC<ZoneListScreenProps> = ({
  zones,
  userLocation,
  permissions,
  onAddZone,
  onEditZone,
  onDeleteZone,
  onToggleZone,
  isDarkTheme = true,
}) => {
  const [zoneToDelete, setZoneToDelete] = useState<GeoZone | null>(null);

  const getCategoryIcon = (category: ZoneCategory, className = 'w-4 h-4') => {
    switch (category) {
      case 'HOME':
        return <Home className={className} />;
      case 'WORK':
        return <Briefcase className={className} />;
      case 'GYM':
        return <Dumbbell className={className} />;
      case 'AIRPORT':
        return <Plane className={className} />;
      default:
        return <MapPin className={className} />;
    }
  };

  const getCategoryBadgeColor = (category: ZoneCategory) => {
    switch (category) {
      case 'HOME':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'WORK':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
      case 'GYM':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'AIRPORT':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20';
      default:
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20';
    }
  };

  const isLocationAvailable =
    permissions.locationServicesEnabled &&
    (permissions.fineLocationGranted || permissions.coarseLocationGranted) &&
    userLocation !== null;

  return (
    <div className="h-full flex flex-col justify-between overflow-hidden relative select-none">
      {/* Header */}
      <div className="p-4 pb-2 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-indigo-500" />
              Geo Zones
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {zones.filter((z) => z.isEnabled).length} active geofenced areas
            </p>
          </div>

          <button
            onClick={onAddZone}
            id="btn-add-zone-header"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Zone</span>
          </button>
        </div>
      </div>

      {/* Zone list scrollable body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Privacy badge */}
        <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex items-start gap-2.5 text-xs text-indigo-900 dark:text-indigo-200">
          <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Local Privacy Guaranteed:</strong> Zone boundaries are evaluated 100% locally on your device. Location coordinates are never logged, tracked, or sent to any server.
          </p>
        </div>

        {zones.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-14 h-14 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-3">
              <MapPin className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No Zones Created Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 mb-4">
              Add zones like Home, Office, or Gym to automate alarms based on where you are.
            </p>
            <button
              onClick={onAddZone}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Create First Zone
            </button>
          </div>
        ) : (
          zones.map((zone) => {
            let distanceText = 'Distance unknown';
            let isInside = false;

            if (isLocationAvailable && userLocation) {
              const dist = calculateDistanceMeters(
                userLocation.latitude,
                userLocation.longitude,
                zone.latitude,
                zone.longitude
              );
              distanceText = `${formatDistance(dist)} away`;
              isInside = dist <= zone.radiusMeters;
            }

            return (
              <motion.div
                key={zone.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3.5 rounded-2xl border transition-all ${
                  !zone.isEnabled
                    ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800'
                    : isInside
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/80 shadow-sm'
                    : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${getCategoryBadgeColor(
                        zone.category
                      )}`}
                    >
                      {getCategoryIcon(zone.category)}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                          {zone.name}
                        </h3>
                        {zone.isEnabled && isLocationAvailable && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              isInside
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {isInside ? '● INSIDE' : '○ OUTSIDE'}
                          </span>
                        )}
                      </div>

                      {zone.address && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {zone.address}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-indigo-500" />
                          Radius: {formatDistance(zone.radiusMeters)}
                        </span>
                        <span>•</span>
                        <span>{distanceText}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <div className="flex flex-col items-end gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={zone.isEnabled}
                        onChange={(e) => onToggleZone(zone.id, e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                    </label>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onEditZone(zone)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Edit zone"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setZoneToDelete(zone)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Delete zone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AnimatePresence>
        {zoneToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 10 }}
              className="w-full max-w-xs rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-3 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Delete "{zoneToDelete.name}"?
              </h4>

              <p className="text-xs text-slate-500 leading-relaxed">
                Any alarms associated with this zone will automatically switch to{' '}
                <strong>Anywhere</strong> mode so they continue to operate normally.
              </p>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setZoneToDelete(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onDeleteZone(zoneToDelete.id);
                    setZoneToDelete(null);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white shadow-md shadow-rose-600/25 cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
