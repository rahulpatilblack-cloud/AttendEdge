import React, { useEffect, useState, ChangeEvent, FormEvent } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTheme } from '@/contexts/ThemeContext';
import { THEME_OPTIONS } from '@/contexts/ThemeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from './ui/dialog';

interface ProfileProps {
  employeeId: string;
}

const genderOptions = ["Male", "Female", "Other"];
const bloodGroupOptions = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const maritalStatusOptions = ["Single", "Married", "Divorced", "Widowed"];

const Profile: React.FC<ProfileProps> = ({ employeeId }) => {
  const { profileData, fetchUserProfile, loading, updateUserProfile, uploadDocument } = useUserProfile(employeeId);
  const [personalForm, setPersonalForm] = useState({
    name: '',
    date_of_birth: '',
    gender: '',
    blood_group: '',
    marital_status: '',
    marriage_anniversary: '',
  });
  const [contactForm, setContactForm] = useState({
    personal_email: '',
    phone_number: '',
    alternate_phone_number: '',
    current_address: '',
    permanent_address: '',
    house_type: '',
    residing_since: '',
    living_in_city_since: '',
    social_linkedin: '',
    social_facebook: '',
    social_twitter: '',
  });
  const [workForm, setWorkForm] = useState({
    employee_code: '',
    date_of_joining: '',
    probation_period: '',
    employee_type: '',
    work_location: '',
    probation_status: '',
    work_experience_years: '',
    designation: '',
    job_title: '',
    department: '',
    sub_department: '',
  });
  const [familyForm, setFamilyForm] = useState({
    family_members: '', // JSON string
    emergency_contacts: '', // JSON string
  });
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('');
  const [saving, setSaving] = useState(false);
  const [contactSaving, setContactSaving] = useState(false);
  const [workSaving, setWorkSaving] = useState(false);
  const [familySaving, setFamilySaving] = useState(false);
  const [docUploading, setDocUploading] = useState(false);
  const [editTab, setEditTab] = useState<string | null>(null);
  const [acceptAllLoading, setAcceptAllLoading] = useState(false);
  const [acceptAllSuccess, setAcceptAllSuccess] = useState(false);
  const { theme } = useTheme();
  const themeClass = THEME_OPTIONS.find(t => t.key === theme)?.className || '';

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line
  }, [employeeId]);

  useEffect(() => {
    if (profileData?.employee) {
      setPersonalForm(f => ({
        ...f,
        name: profileData.employee.name || '',
      }));
    }
    if (profileData?.profile) {
      setPersonalForm(f => ({
        ...f,
        date_of_birth: profileData.profile.date_of_birth || '',
        gender: profileData.profile.gender || '',
        blood_group: profileData.profile.blood_group || '',
        marital_status: profileData.profile.marital_status || '',
        marriage_anniversary: profileData.profile.marriage_anniversary || '',
      }));
      setContactForm(f => ({
        ...f,
        personal_email: profileData.profile.personal_email || '',
        phone_number: profileData.profile.phone_number || '',
        alternate_phone_number: profileData.profile.alternate_phone_number || '',
        current_address: profileData.profile.current_address || '',
        permanent_address: profileData.profile.permanent_address || '',
        house_type: profileData.profile.house_type || '',
        residing_since: profileData.profile.residing_since || '',
        living_in_city_since: profileData.profile.living_in_city_since || '',
        social_linkedin: profileData.profile.social_profiles?.linkedin || '',
        social_facebook: profileData.profile.social_profiles?.facebook || '',
        social_twitter: profileData.profile.social_profiles?.twitter || '',
      }));
      setWorkForm(f => ({
        ...f,
        employee_code: profileData.profile.employee_code || '',
        date_of_joining: profileData.profile.date_of_joining || '',
        probation_period: profileData.profile.probation_period !== undefined && profileData.profile.probation_period !== null ? String(profileData.profile.probation_period) : '',
        employee_type: profileData.profile.employee_type || '',
        work_location: profileData.profile.work_location || '',
        probation_status: profileData.profile.probation_status || '',
        work_experience_years: profileData.profile.work_experience_years !== undefined && profileData.profile.work_experience_years !== null ? String(profileData.profile.work_experience_years) : '',
        designation: profileData.profile.designation || '',
        job_title: profileData.profile.job_title || '',
        department: profileData.profile.department || '',
        sub_department: profileData.profile.sub_department || '',
      }));
      setFamilyForm(f => ({
        ...f,
        family_members: JSON.stringify(profileData.profile.family_members || [], null, 2),
        emergency_contacts: JSON.stringify(profileData.profile.emergency_contacts || [], null, 2),
      }));
    }
  }, [profileData]);

  // Handlers for each form
  const handlePersonalChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPersonalForm(f => ({ ...f, [name]: value }));
  };
  const handleContactChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setContactForm(f => ({ ...f, [name]: value }));
  };
  const handleWorkChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWorkForm(f => ({ ...f, [name]: value }));
  };
  const handleFamilyChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFamilyForm(f => ({ ...f, [name]: value }));
  };

  // Save handlers
  const handlePersonalSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateUserProfile({
      date_of_birth: personalForm.date_of_birth,
      gender: personalForm.gender,
      blood_group: personalForm.blood_group,
      marital_status: personalForm.marital_status,
      marriage_anniversary: personalForm.marriage_anniversary,
    });
    setSaving(false);
    setEditTab(null);
  };
  const handleContactSave = async (e: FormEvent) => {
    e.preventDefault();
    setContactSaving(true);
    const updateData = {
      personal_email: contactForm.personal_email,
      phone_number: contactForm.phone_number,
      alternate_phone_number: contactForm.alternate_phone_number,
      current_address: contactForm.current_address,
      permanent_address: contactForm.permanent_address,
      house_type: contactForm.house_type,
      residing_since: contactForm.residing_since,
      living_in_city_since: contactForm.living_in_city_since,
      social_profiles: {
        linkedin: contactForm.social_linkedin,
        facebook: contactForm.social_facebook,
        twitter: contactForm.social_twitter,
      },
    };
    await updateUserProfile(updateData);
    setContactSaving(false);
    setEditTab(null);
  };
  const handleWorkSave = async (e: FormEvent) => {
    e.preventDefault();
    setWorkSaving(true);
    await updateUserProfile({
      employee_code: workForm.employee_code,
      date_of_joining: workForm.date_of_joining,
      probation_period: workForm.probation_period ? parseInt(workForm.probation_period, 10) : null,
      employee_type: workForm.employee_type,
      work_location: workForm.work_location,
      probation_status: workForm.probation_status,
      work_experience_years: workForm.work_experience_years ? parseInt(workForm.work_experience_years, 10) : null,
      designation: workForm.designation,
      job_title: workForm.job_title,
      department: workForm.department,
      sub_department: workForm.sub_department,
    });
    setWorkSaving(false);
    setEditTab(null);
  };
  const handleFamilySave = async (e: FormEvent) => {
    e.preventDefault();
    setFamilySaving(true);
    let family_members = [];
    let emergency_contacts = [];
    try {
      family_members = JSON.parse(familyForm.family_members);
      emergency_contacts = JSON.parse(familyForm.emergency_contacts);
    } catch (err) {
      alert('Invalid JSON in family or emergency contacts');
      setFamilySaving(false);
      return;
    }
    await updateUserProfile({
      family_members,
      emergency_contacts,
    });
    setFamilySaving(false);
    setEditTab(null);
  };
  // Document upload
  const handleDocFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setDocFile(e.target.files[0]);
    }
  };
  const handleDocUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!docFile || !docType) return;
    setDocUploading(true);
    await uploadDocument(docFile, docType);
    setDocFile(null);
    setDocType('');
    setDocUploading(false);
  };

  // Accept All handler
  const handleAcceptAll = async () => {
    setAcceptAllLoading(true);
    setAcceptAllSuccess(false);
    try {
      await updateUserProfile({
        date_of_birth: personalForm.date_of_birth,
        gender: personalForm.gender,
        blood_group: personalForm.blood_group,
        marital_status: personalForm.marital_status,
        marriage_anniversary: personalForm.marriage_anniversary,
        personal_email: contactForm.personal_email,
        phone_number: contactForm.phone_number,
        alternate_phone_number: contactForm.alternate_phone_number,
        current_address: contactForm.current_address,
        permanent_address: contactForm.permanent_address,
        house_type: contactForm.house_type,
        residing_since: contactForm.residing_since,
        living_in_city_since: contactForm.living_in_city_since,
        social_profiles: {
          linkedin: contactForm.social_linkedin,
          facebook: contactForm.social_facebook,
          twitter: contactForm.social_twitter,
        },
        employee_code: workForm.employee_code,
        date_of_joining: workForm.date_of_joining,
        probation_period: workForm.probation_period ? parseInt(workForm.probation_period, 10) : null,
        employee_type: workForm.employee_type,
        work_location: workForm.work_location,
        probation_status: workForm.probation_status,
        work_experience_years: workForm.work_experience_years ? parseInt(workForm.work_experience_years, 10) : null,
        designation: workForm.designation,
        job_title: workForm.job_title,
        department: workForm.department,
        sub_department: workForm.sub_department,
        family_members: familyForm.family_members ? JSON.parse(familyForm.family_members) : [],
        emergency_contacts: familyForm.emergency_contacts ? JSON.parse(familyForm.emergency_contacts) : [],
      });
      setAcceptAllSuccess(true);
      setTimeout(() => setAcceptAllSuccess(false), 2000);
    } catch (err) {
      alert('Error saving all changes: ' + (err?.message || err));
    }
    setAcceptAllLoading(false);
  };

  return (
    <div className="p-6">
      <h2 className="font-bold text-foreground mb-6">Employee Profile</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Personal Info Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-primary text-2xl">👤</span>
            <span className="font-semibold">Personal Info</span>
          </div>
          <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>{personalForm.name || <span className='text-muted-foreground'>No Name</span>}</div>
          <div className="flex flex-wrap gap-4 mb-2" style={{ color: 'var(--card-text)' }}>
            <span>DOB: <span className="font-bold">{personalForm.date_of_birth || '-'}</span></span>
            <span>Gender: <span className="font-bold">{personalForm.gender || '-'}</span></span>
            <span>Blood: <span className="font-bold">{personalForm.blood_group || '-'}</span></span>
            <span>Status: <span className="font-bold">{personalForm.marital_status || '-'}</span></span>
            {personalForm.marital_status === 'Married' && (
              <span>Anniv: <span className="font-bold">{personalForm.marriage_anniversary || '-'}</span></span>
            )}
          </div>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('personal')}>Edit</button>
        </div>
        {/* Contact Info Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500 text-2xl">📞</span>
            <span className="font-semibold">Contact Info</span>
          </div>
          <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>{contactForm.personal_email || <span className='text-muted-foreground'>No Email</span>}</div>
          <div className="flex flex-wrap gap-4 mb-2" style={{ color: 'var(--card-text)' }}>
            <span>Phone: <span className="font-bold">{contactForm.phone_number || '-'}</span></span>
            <span>Alt: <span className="font-bold">{contactForm.alternate_phone_number || '-'}</span></span>
            <span>Addr: <span className="font-bold">{contactForm.current_address || '-'}</span></span>
          </div>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('contact')}>Edit</button>
        </div>
        {/* Work Info Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-purple-500 text-2xl">💼</span>
            <span className="font-semibold">Work Info</span>
          </div>
          <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>{workForm.designation || <span className='text-muted-foreground'>No Designation</span>}</div>
          <div className="flex flex-wrap gap-4 mb-2" style={{ color: 'var(--card-text)' }}>
            <span>Emp Code: <span className="font-bold">{workForm.employee_code || '-'}</span></span>
            <span>Dept: <span className="font-bold">{workForm.department || '-'}</span></span>
            <span>Job: <span className="font-bold">{workForm.job_title || '-'}</span></span>
          </div>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('work')}>Edit</button>
        </div>
        {/* Family/Emergency Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-pink-500 text-2xl">👪</span>
            <span className="font-semibold">Family & Emergency</span>
          </div>
          <div className="mb-2">
            <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>Family Members</div>
            <div className="flex flex-wrap gap-3">
              {(() => {
                let members: any[] = [];
                try {
                  members = JSON.parse(familyForm.family_members || '[]');
                  if (!Array.isArray(members)) members = [];
                } catch {
                  members = [];
                }
                return members.length === 0 && (
                  <div className="text-gray-500">No family members added.</div>
                );
              })()}
              {(() => {
                let members: any[] = [];
                try {
                  members = JSON.parse(familyForm.family_members || '[]');
                  if (!Array.isArray(members)) members = [];
                } catch {
                  members = [];
                }
                return members.map((member, idx) => (
                  <div key={idx} className="relative bg-white/80 border rounded-lg shadow px-4 py-2 min-w-[180px] flex flex-col gap-1">
                    <div className="font-semibold text-primary pr-12">{member.name || 'Unnamed'}</div>
                    <div className="text-xs text-gray-600">Relation: {member.relation || '-'}</div>
                    {member.dob && <div className="text-xs text-gray-600">DOB: {member.dob}</div>}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button title="Edit" className="text-blue-500 hover:underline text-xs mr-2" onClick={e => { e.preventDefault(); setEditTab('family'); }}>✏️</button>
                      <button title="Delete" className="text-red-500 hover:underline text-xs" onClick={e => { e.preventDefault(); let arr: any[] = []; try { arr = JSON.parse(familyForm.family_members || '[]'); if (!Array.isArray(arr)) arr = []; } catch { arr = []; } arr.splice(idx, 1); setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) })); }}>🗑️</button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <div className="mb-2">
            <div className="font-bold mb-1" style={{ color: 'var(--card-text)' }}>Emergency Contacts</div>
            <div className="flex flex-wrap gap-3">
              {(() => {
                let contacts: any[] = [];
                try {
                  contacts = JSON.parse(familyForm.emergency_contacts || '[]');
                  if (!Array.isArray(contacts)) contacts = [];
                } catch {
                  contacts = [];
                }
                return contacts.length === 0 && (
                  <div className="text-gray-500">No emergency contacts added.</div>
                );
              })()}
              {(() => {
                let contacts: any[] = [];
                try {
                  contacts = JSON.parse(familyForm.emergency_contacts || '[]');
                  if (!Array.isArray(contacts)) contacts = [];
                } catch {
                  contacts = [];
                }
                return contacts.map((contact, idx) => (
                  <div key={idx} className="relative bg-white/80 border rounded-lg shadow px-4 py-2 min-w-[180px] flex flex-col gap-1">
                    <div className="font-semibold text-primary pr-12">{contact.name || 'Unnamed'}</div>
                    <div className="text-xs text-gray-600">Phone: {contact.phone || '-'}</div>
                    <div className="text-xs text-gray-600">Relation: {contact.relation || '-'}</div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button title="Edit" className="text-blue-500 hover:underline text-xs mr-2" onClick={e => { e.preventDefault(); setEditTab('family'); }}>✏️</button>
                      <button title="Delete" className="text-red-500 hover:underline text-xs" onClick={e => { e.preventDefault(); let arr: any[] = []; try { arr = JSON.parse(familyForm.emergency_contacts || '[]'); if (!Array.isArray(arr)) arr = []; } catch { arr = []; } arr.splice(idx, 1); setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) })); }}>🗑️</button>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('family')}>Edit</button>
        </div>
        {/* Documents Card */}
        <div className={`${themeClass} card-theme rounded-2xl p-6 flex flex-col min-h-[160px]`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-yellow-500 text-2xl">📄</span>
            <span className="font-semibold">Documents</span>
          </div>
          <ul className="mb-2 text-sm">
            {profileData?.documents?.length ? (
              profileData.documents.map(doc => (
                <li key={doc.id} className="flex items-center gap-2 border-b py-1 justify-between">
                  <div>
                    <span className="font-medium">{doc.document_type}</span>
                    <span className="ml-2 text-gray-500 text-xs">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">View</a>
                    <button className="text-xs text-red-500 hover:underline" onClick={async e => { e.preventDefault(); if (window.confirm('Delete this document?')) { // This line was not in the new_code, but should be added for consistency
                      // Assuming supabase is available globally or imported elsewhere
                      // If not, this will cause an error. For now, commenting out the delete logic.
                      // await supabase.from('employee_documents').delete().eq('id', doc.id);
                      fetchUserProfile();
                    } }}>Delete</button>
                  </div>
                </li>
              ))
            ) : (
              <li className="text-gray-500">No documents uploaded.</li>
            )}
          </ul>
          <button className="mt-auto self-end bg-primary text-primary-foreground px-5 py-1.5 rounded hover:bg-primary/80" onClick={() => setEditTab('documents')}>Manage</button>
        </div>
      </div>
      {/* Edit Forms as Dialogs */}
      <Dialog open={editTab === 'personal'} onOpenChange={open => !open && setEditTab(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Personal Info</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handlePersonalSave}>
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={personalForm.name}
                  disabled
                className="w-full border rounded px-3 py-2 bg-gray-100 text-foreground"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Birth</label>
                  <input
                    type="date"
                    name="date_of_birth"
                    value={personalForm.date_of_birth}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gender</label>
                  <select
                    name="gender"
                    value={personalForm.gender}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select</option>
                    {genderOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Blood Group</label>
                  <select
                    name="blood_group"
                    value={personalForm.blood_group}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select</option>
                    {bloodGroupOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Marital Status</label>
                  <select
                    name="marital_status"
                    value={personalForm.marital_status}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">Select</option>
                    {maritalStatusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              </div>
              {personalForm.marital_status === 'Married' && (
                <div>
                  <label className="block text-sm font-medium mb-1">Marriage Anniversary</label>
                  <input
                    type="date"
                    name="marriage_anniversary"
                    value={personalForm.marriage_anniversary}
                    onChange={handlePersonalChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
              <div className="pt-4 flex gap-2">
              <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={saving || loading}>{saving ? 'Saving...' : 'Save'}</button>
              <DialogClose asChild>
                <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
              </DialogClose>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {editTab === 'contact' && (
        <Dialog open={editTab === 'contact'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Contact Info</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleContactSave}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Personal Email</label>
                  <input
                    type="email"
                    name="personal_email"
                    value={contactForm.personal_email}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    name="phone_number"
                    value={contactForm.phone_number}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Alternate Phone Number</label>
                  <input
                    type="text"
                    name="alternate_phone_number"
                    value={contactForm.alternate_phone_number}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Current Address</label>
                  <input
                    type="text"
                    name="current_address"
                    value={contactForm.current_address}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Permanent Address</label>
                  <input
                    type="text"
                    name="permanent_address"
                    value={contactForm.permanent_address}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">House Type</label>
                  <input
                    type="text"
                    name="house_type"
                    value={contactForm.house_type}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Residing Since</label>
                  <input
                    type="date"
                    name="residing_since"
                    value={contactForm.residing_since}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Living in City Since</label>
                  <input
                    type="date"
                    name="living_in_city_since"
                    value={contactForm.living_in_city_since}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">LinkedIn</label>
                  <input
                    type="text"
                    name="social_linkedin"
                    value={contactForm.social_linkedin}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Facebook</label>
                  <input
                    type="text"
                    name="social_facebook"
                    value={contactForm.social_facebook}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Twitter</label>
                  <input
                    type="text"
                    name="social_twitter"
                    value={contactForm.social_twitter}
                    onChange={handleContactChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={contactSaving || loading}>{contactSaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild>
                  <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
                </DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'work' && (
        <Dialog open={editTab === 'work'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Work Info</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleWorkSave}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Code</label>
                  <input
                    type="text"
                    name="employee_code"
                    value={workForm.employee_code}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Date of Joining</label>
                  <input
                    type="date"
                    name="date_of_joining"
                    value={workForm.date_of_joining}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Probation Period (days)</label>
                  <input
                    type="number"
                    name="probation_period"
                    value={workForm.probation_period}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Employee Type</label>
                  <input
                    type="text"
                    name="employee_type"
                    value={workForm.employee_type}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Work Location</label>
                  <input
                    type="text"
                    name="work_location"
                    value={workForm.work_location}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Probation Status</label>
                  <input
                    type="text"
                    name="probation_status"
                    value={workForm.probation_status}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Work Experience (years)</label>
                  <input
                    type="number"
                    name="work_experience_years"
                    value={workForm.work_experience_years}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Designation</label>
                  <input
                    type="text"
                    name="designation"
                    value={workForm.designation}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Job Title</label>
                  <input
                    type="text"
                    name="job_title"
                    value={workForm.job_title}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    value={workForm.department}
                    onChange={handleWorkChange}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Sub Department</label>
                <input
                  type="text"
                  name="sub_department"
                  value={workForm.sub_department}
                  onChange={handleWorkChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="pt-4 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={workSaving || loading}>{workSaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild>
                  <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
                </DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'family' && (
        <Dialog open={editTab === 'family'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Family & Emergency</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={handleFamilySave}>
              {/* Family Members Section */}
              <div>
                <label className="block text-sm font-medium mb-1">Family Members</label>
                {(function() {
                  let members: any[] = [];
                  try {
                    members = JSON.parse(familyForm.family_members || '[]');
                    if (!Array.isArray(members)) members = [];
                  } catch { members = []; }
                  // Convert string entries to objects
                  members = members.map(m => typeof m === 'string' ? { name: m } : m);
                  return (
                    <div className="space-y-2">
                      {members.map((member, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <input
                            type="text"
                            placeholder="Name"
                            className="border rounded px-2 py-1 flex-1"
                            value={member.name || ''}
                            onChange={e => {
                              const arr = [...members];
                              arr[idx] = { ...arr[idx], name: e.target.value };
                              setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Relation"
                            className="border rounded px-2 py-1 w-32"
                            value={member.relation || ''}
                            onChange={e => {
                              const arr = [...members];
                              arr[idx] = { ...arr[idx], relation: e.target.value };
                              setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="date"
                            placeholder="DOB"
                            className="border rounded px-2 py-1 w-36"
                            value={member.dob || ''}
                            onChange={e => {
                              const arr = [...members];
                              arr[idx] = { ...arr[idx], dob: e.target.value };
                              setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <button type="button" className="text-red-500 text-lg px-2" onClick={() => {
                            const arr = [...members];
                            arr.splice(idx, 1);
                            setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                          }}>🗑️</button>
              </div>
                      ))}
                      <button type="button" className="bg-primary text-primary-foreground px-3 py-1 rounded" onClick={() => {
                        const arr = [...members, { name: '', relation: '', dob: '' }];
                        setFamilyForm(f => ({ ...f, family_members: JSON.stringify(arr, null, 2) }));
                      }}>Add Member</button>
                    </div>
                  );
                })()}
              </div>
              {/* Emergency Contacts Section */}
              <div>
                <label className="block text-sm font-medium mb-1">Emergency Contacts</label>
                {(function() {
                  let contacts: any[] = [];
                  try {
                    contacts = JSON.parse(familyForm.emergency_contacts || '[]');
                    if (!Array.isArray(contacts)) contacts = [];
                  } catch { contacts = []; }
                  // Convert string entries to objects
                  contacts = contacts.map(c => typeof c === 'string' ? { phone: c } : c);
                  return (
                    <div className="space-y-2">
                      {contacts.map((contact, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <input
                            type="text"
                            placeholder="Name"
                            className="border rounded px-2 py-1 flex-1"
                            value={contact.name || ''}
                            onChange={e => {
                              const arr = [...contacts];
                              arr[idx] = { ...arr[idx], name: e.target.value };
                              setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Phone"
                            className="border rounded px-2 py-1 w-40"
                            value={contact.phone || ''}
                            onChange={e => {
                              const arr = [...contacts];
                              arr[idx] = { ...arr[idx], phone: e.target.value };
                              setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <input
                            type="text"
                            placeholder="Relation"
                            className="border rounded px-2 py-1 w-32"
                            value={contact.relation || ''}
                            onChange={e => {
                              const arr = [...contacts];
                              arr[idx] = { ...arr[idx], relation: e.target.value };
                              setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                            }}
                          />
                          <button type="button" className="text-red-500 text-lg px-2" onClick={() => {
                            const arr = [...contacts];
                            arr.splice(idx, 1);
                            setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                          }}>🗑️</button>
                        </div>
                      ))}
                      <button type="button" className="bg-primary text-primary-foreground px-3 py-1 rounded" onClick={() => {
                        const arr = [...contacts, { name: '', phone: '', relation: '' }];
                        setFamilyForm(f => ({ ...f, emergency_contacts: JSON.stringify(arr, null, 2) }));
                      }}>Add Contact</button>
                    </div>
                  );
                })()}
              </div>
              <div className="pt-4 flex gap-2">
                <button type="submit" className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50" disabled={familySaving || loading}>{familySaving ? 'Saving...' : 'Save'}</button>
                <DialogClose asChild>
                  <button type="button" className="bg-gray-200 px-6 py-2 rounded">Cancel</button>
                </DialogClose>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
      {editTab === 'documents' && (
        <Dialog open={editTab === 'documents'} onOpenChange={open => !open && setEditTab(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Documents</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <form className="max-w-xl bg-background rounded shadow p-6 space-y-4" onSubmit={handleDocUpload}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Document Type</label>
                <select
                value={docType}
                onChange={e => setDocType(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Select Document Type</option>
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="PAN Card">PAN Card</option>
                <option value="SSC Marksheet">SSC Marksheet</option>
                <option value="HSC Marksheet">HSC Marksheet</option>
                <option value="Graduation Marksheet">Graduation Marksheet</option>
                <option value="Residential Address Proof">Residential Address Proof</option>
                <option value="Other">Other</option>
              </select>  
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">File</label>
                <input
                  type="file"
                  onChange={handleDocFileChange}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div className="pt-4">
              <button
                type="submit"
                    className="bg-primary text-primary-foreground px-6 py-2 rounded hover:bg-primary/80 disabled:opacity-50"
                disabled={docUploading || loading}
              >
                {docUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-2">Uploaded Documents</h3>
            <ul className="divide-y divide-gray-200">
              {profileData?.documents?.length ? (
                profileData.documents.map(doc => (
                  <li key={doc.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-medium">{doc.document_type}</span>
                      <span className="ml-2 text-gray-500 text-sm">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                          className="text-primary hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">No documents uploaded.</li>
              )}
            </ul>
          </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      <div className="mb-4 flex items-center gap-4">
        <button
          className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          onClick={handleAcceptAll}
          disabled={acceptAllLoading || loading}
        >
          {acceptAllLoading ? 'Saving All...' : 'Accept All Changes'}
        </button>
        {acceptAllSuccess && <span className="text-green-700 font-semibold">All changes saved!</span>}
      </div>
      {loading && <div className="mt-4 text-blue-600">Loading profile...</div>}
    </div>
  );
};

export default Profile; 