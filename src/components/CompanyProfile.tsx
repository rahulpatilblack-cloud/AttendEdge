import React, { useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Globe, MapPin, Users, Building, Calendar, Info, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from './ui/switch';

const defaultFields = {
  name: '',
  description: '',
  website: '',
  industry: '',
  size: '',
  headquarters: '',
  type: '',
  founded: '',
  locations: '',
};

const CompanyProfile: React.FC = () => {
  const { currentCompany, refreshCompanies } = useCompany();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const [fields, setFields] = useState({
    ...defaultFields,
    ...currentCompany,
  });
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(isAdmin ? false : undefined); // Only admins can edit
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [perfReportEnabled, setPerfReportEnabled] = useState(currentCompany?.moduleSettings?.performance_report_enabled ?? false);
  const [perfReportLoading, setPerfReportLoading] = useState(false);
  const [perfReportError, setPerfReportError] = useState('');

  // Placeholder for backend call
  const fetchFromLinkedIn = async () => {
    setLoading(true);
    setError('');
    try {
      // TODO: Replace with real backend call
      // Example: const res = await fetch(`/api/scrape-linkedin?url=${encodeURIComponent(linkedinUrl)}`);
      // const data = await res.json();
      // setFields({ ...fields, ...data });
      setTimeout(() => {
        setFields(f => ({
          ...f,
          name: 'New York Technology India Pvt. Ltd.',
          description: 'Established in 1999, New York Technology Partners is a global IT and Engineering consulting services company...',
          website: 'https://www.nytp.com/',
          industry: 'IT Services and IT Consulting',
          size: '51-200 employees',
          headquarters: 'Mumbai, Maharashtra',
          type: 'Privately Held',
          founded: '2016',
          locations: 'Mumbai, Indore, Hyderabad',
        }));
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('Failed to fetch data from LinkedIn.');
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields({ ...fields, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !isAdmin) return;
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `company-logos/${fields.id || currentCompany?.id || 'company'}.${fileExt}`;
    setLoading(true);
    setError('');
    try {
      // Upload to Supabase Storage (company-document bucket)
      const { data, error: uploadError } = await supabase.storage.from('company-document').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      // Get public URL
      const { data: urlData } = supabase.storage.from('company-document').getPublicUrl(filePath);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to get public URL');
      // Update company logo_url in DB
      const { error: updateError } = await supabase.from('companies').update({ logo_url: publicUrl }).eq('id', currentCompany?.id);
      if (updateError) throw updateError;
      setFields(f => ({ ...f, logo_url: publicUrl }));
      if (currentCompany) currentCompany.logo_url = publicUrl;
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    try {
      const { error: updateError } = await supabase
        .from('companies')
        .update({
          name: fields.name,
          description: fields.description,
          website: fields.website,
          industry: fields.industry,
          size: fields.size,
          headquarters: fields.headquarters,
          type: fields.type,
          founded: fields.founded,
          locations: fields.locations,
        })
        .eq('id', currentCompany?.id);
      if (updateError) throw updateError;
      setEditMode(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setLoading(false);
    }
  };

  const handlePerfReportToggle = async (checked: boolean) => {
    setPerfReportLoading(true);
    setPerfReportError('');
    try {
      const { error } = await supabase
        .from('company_module_settings')
        .upsert({ company_id: currentCompany?.id, performance_report_enabled: checked }, { onConflict: ['company_id'] });
      if (error) throw error;
      setPerfReportEnabled(checked);
      if (refreshCompanies) await refreshCompanies();
    } catch (err: any) {
      setPerfReportError(err.message || 'Failed to update setting');
    } finally {
      setPerfReportLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-blue-50 to-purple-50 py-10 px-2 overflow-x-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-30" style={{background: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' fill=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Crect x=\'0\' y=\'0\' width=\'40\' height=\'40\' fill=\'%23f3f4f6\'/%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'1.5\' fill=\'%238b5cf6\'/%3E%3C/svg%3E") repeat'}} />
      {/* Card with animated gradient border and blur */}
      <div className="relative max-w-3xl mx-auto rounded-3xl p-1 bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 animate-gradient-move shadow-2xl" style={{boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)'}}>
        <div className="rounded-[22px] bg-white/80 backdrop-blur-md p-8 animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <div className="w-36 h-36 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full p-2 shadow-xl flex items-center justify-center mb-2 relative group cursor-pointer" 
              onClick={() => isAdmin && fileInputRef.current?.click()} 
              tabIndex={isAdmin ? 0 : -1} 
              aria-label="Upload company logo" 
              role="button">
              {fields.logo_url ? (
                <img src={fields.logo_url} alt="Logo" className="h-32 w-auto rounded-full shadow-2xl object-contain" />
              ) : (
                <div className="h-32 w-32 flex items-center justify-center text-gray-400 bg-gray-100 rounded-full">No Logo</div>
              )}
              {/* Camera icon overlay on hover for admins */}
              {isAdmin && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-10 h-10 text-white drop-shadow" />
                </div>
              )}
              {/* Hidden file input */}
              {isAdmin && (
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  aria-label="Upload company logo"
                />
              )}
            </div>
            {/* Gradient accent bar */}
            <div className="w-24 h-1 rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 mb-4 animate-pulse" />
            <h1 className="text-4xl font-extrabold text-gray-900 text-center font-serif tracking-tight mb-1">{fields.name}</h1>
            {/* Company type badge */}
            {fields.type && (
              <span className="inline-block px-3 py-1 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 text-xs font-semibold shadow-sm mb-2 border border-blue-200 uppercase tracking-wider">{fields.type}</span>
            )}
            <a href={fields.website} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline text-lg mt-1 transition-colors duration-200 hover:text-purple-700">{fields.website}</a>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3 mb-4">
              <span className="font-medium text-sm">Performance Report Module</span>
              <Switch
                checked={perfReportEnabled}
                onCheckedChange={handlePerfReportToggle}
                disabled={perfReportLoading}
              />
              <span className="text-xs text-gray-500">{perfReportEnabled ? 'Enabled' : 'Disabled'}</span>
              {perfReportLoading && <span className="text-xs text-blue-500 ml-2">Saving...</span>}
              {perfReportError && <span className="text-xs text-red-500 ml-2">{perfReportError}</span>}
            </div>
          )}
          {editMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-medium">Name</label>
                <Input name="name" value={fields.name ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div>
                <label className="font-medium">Website</label>
                <Input name="website" value={fields.website ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div>
                <label className="font-medium">Industry</label>
                <Input name="industry" value={fields.industry ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div>
                <label className="font-medium">Company Size</label>
                <Input name="size" value={fields.size ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div>
                <label className="font-medium">Headquarters</label>
                <Input name="headquarters" value={fields.headquarters ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div>
                <label className="font-medium">Type</label>
                <Input name="type" value={fields.type ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div>
                <label className="font-medium">Founded</label>
                <Input name="founded" value={fields.founded ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div className="md:col-span-2">
                <label className="font-medium">Locations</label>
                <Input name="locations" value={fields.locations ?? ''} onChange={handleChange} readOnly={!isAdmin} />
              </div>
              <div className="md:col-span-2">
                <label className="font-medium">Description</label>
                <textarea name="description" value={fields.description ?? ''} onChange={handleChange} className="w-full p-2 border rounded" rows={4} readOnly={!isAdmin} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase text-xs mb-1">
                    <Globe className="w-4 h-4" /> Industry
                  </div>
                  <div className="text-base text-gray-800">{fields.industry}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase text-xs mb-1">
                    <Users className="w-4 h-4" /> Company Size
                  </div>
                  <div className="text-base text-gray-800">{fields.size}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase text-xs mb-1">
                    <MapPin className="w-4 h-4" /> Headquarters
                  </div>
                  <div className="text-base text-gray-800">{fields.headquarters}</div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase text-xs mb-1">
                    <Calendar className="w-4 h-4" /> Founded
                  </div>
                  <div className="text-base text-gray-800">{fields.founded}</div>
                </div>
              </div>
              {/* Gradient divider */}
              <div className="h-1 w-full rounded-full bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-60 my-6 animate-pulse" />
              <div className="mb-6">
                <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase text-xs mb-1">
                  <MapPin className="w-4 h-4" /> Locations
                </div>
                <div className="text-base text-gray-800">{fields.locations}</div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-gray-500 font-semibold uppercase text-xs mb-1">
                  <Info className="w-4 h-4" /> Description
                </div>
                <div className="text-base text-gray-800 whitespace-pre-line leading-relaxed">{fields.description}</div>
              </div>
            </>
          )}
          {/* Edit/Save Buttons for Admins */}
          {isAdmin && (
            <div className="flex gap-3 mt-6">
              {editMode ? (
                <>
                  <Button onClick={handleSave} disabled={loading} variant="gradient">{loading ? 'Saving...' : 'Save'}</Button>
                  <Button onClick={() => setEditMode(false)} variant="outline" disabled={loading}>Cancel</Button>
                </>
              ) : (
                <Button onClick={() => setEditMode(true)} variant="gradient">Edit</Button>
              )}
            </div>
          )}
          {/* LinkedIn import only in edit mode for admins */}
          {isAdmin && editMode && (
            <Card className="mb-6 mt-8">
              <CardHeader>
                <CardTitle>Import from LinkedIn</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-center">
                  <Input
                    placeholder="Paste LinkedIn company URL"
                    value={linkedinUrl}
                    onChange={e => setLinkedinUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={fetchFromLinkedIn} disabled={!linkedinUrl || loading}>
                    {loading ? 'Fetching...' : 'Fetch from LinkedIn'}
                  </Button>
                </div>
                {error && <div className="text-red-500 mt-2">{error}</div>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompanyProfile; 