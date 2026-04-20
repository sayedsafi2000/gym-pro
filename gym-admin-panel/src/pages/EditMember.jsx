import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate, useParams, Link } from 'react-router-dom';
import useToast from '../hooks/useToast';

const EditMember = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    emergencyPhone: '',
    address: '',
    gender: '',
    joinDate: '',
    packageId: '',
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
    paymentType: 'none',
    additionalPayment: '',
  });
  const [packages, setPackages] = useState([]);
  const [devices, setDevices] = useState([]);
  const [fingerprint, setFingerprint] = useState({
    deviceUserId: null,
    registered: false,
  });
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [registering, setRegistering] = useState(false);
  const [fpMessage, setFpMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    fetchPackages();
    fetchMember();
    fetchDevices();
  }, [id]);

  const fetchPackages = async () => {
    try {
      const res = await api.get('/packages');
      setPackages(res.data.data);
    } catch (error) {
      console.error('Error fetching packages:', error);
    }
  };

  const fetchDevices = async () => {
    try {
      const res = await api.get('/devices');
      setDevices(res.data.data);
      if (res.data.data.length > 0) {
        setSelectedDeviceId(res.data.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const fetchMember = async () => {
    try {
      const res = await api.get(`/members/${id}`);
      const member = res.data.data;

      // Format date for input (YYYY-MM-DD)
      const joinDate = new Date(member.joinDate);
      const formattedDate = joinDate.toISOString().split('T')[0];

      setFingerprint({
        deviceUserId: member.deviceUserId,
        registered: member.deviceUserId != null,
      });

      setFormData({
        name: member.name,
        phone: member.phone,
        address: member.address || '',
        emergencyPhone: member.emergencyPhone || '',
        gender: member.gender,
        joinDate: formattedDate,
        packageId: member.packageId._id,
        totalAmount: member.totalAmount || 0,
        paidAmount: member.paidAmount || 0,
        dueAmount: member.dueAmount || 0,
        paymentType: 'none',
        additionalPayment: '',
      });
    } catch (error) {
      showError('Error loading member. Redirecting to members list.');
      navigate('/members');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Validate payment amount
      if ((formData.paymentType === 'partial' || formData.paymentType === 'full') && formData.additionalPayment) {
        const paymentAmount = parseFloat(formData.additionalPayment) || 0;
        if (paymentAmount <= 0) {
          showError('Please enter a valid payment amount greater than 0');
          setSubmitting(false);
          return;
        }
        if (paymentAmount > formData.dueAmount) {
          showError(`Payment amount cannot exceed due amount of ৳${formData.dueAmount}`);
          setSubmitting(false);
          return;
        }
      }

      const submitData = {
        ...formData,
        additionalPayment: (formData.paymentType === 'partial' || formData.paymentType === 'full') ? parseFloat(formData.additionalPayment) : undefined,
      };

      await api.put(`/members/${id}`, submitData);
      showSuccess('Member updated successfully');
      navigate('/members');
    } catch (error) {
      showError('Error updating member. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white border border-slate-200 p-8 shadow-sm rounded-[5px] dark:bg-slate-900 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <Link to="/members" className="text-sm text-slate-500 hover:text-slate-700 transition-colors dark:text-slate-400">&larr; Back to Members</Link>
            <h1 className="text-3xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Edit Member</h1>
            <p className="text-slate-500 dark:text-slate-400">Update member information</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-[5px] shadow-xl p-8 dark:bg-slate-900">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 dark:text-slate-200">
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Enter phone number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">Emergency Phone</label>
                <input
                  type="tel"
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Emergency contact number (optional)"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">
                  Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  placeholder="Enter address (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">
                  Gender *
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </div>

          {/* Fingerprint Registration */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 dark:text-slate-200">
              Fingerprint Registration
            </h2>

            {fpMessage.text && (
              <div className={`mb-4 px-4 py-3 rounded-[5px] text-sm border ${
                fpMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {fpMessage.text}
              </div>
            )}

            {fingerprint.registered ? (
              <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800/60 rounded-[5px] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-green-800">Fingerprint Registered</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Device User ID: {fingerprint.deviceUserId}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
                      Member can scan fingerprint at the device for attendance.
                    </p>
                  </div>
                  <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-[5px] border border-green-300 bg-green-100 text-green-700 dark:text-green-300">
                    Active
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-[5px] p-5 dark:bg-slate-950 dark:border-slate-700">
                <p className="text-sm font-semibold text-slate-800 mb-1 dark:text-slate-200">No Fingerprint Registered</p>
                <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">
                  Select a device and click register. Then have the member enroll their fingerprint at the device.
                </p>
                {devices.length > 0 ? (
                  <div className="flex flex-wrap items-end gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 dark:text-slate-400">Device</label>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="px-4 py-2.5 border border-slate-200 rounded-[5px] text-sm focus:ring-2 focus:ring-slate-300 focus:border-transparent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {devices.map((d) => (
                          <option key={d._id} value={d._id}>
                            {d.name} ({d.ip})
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedDeviceId) return;
                        setRegistering(true);
                        setFpMessage({ type: '', text: '' });
                        try {
                          const res = await api.post(`/devices/${selectedDeviceId}/register-user`, {
                            memberId: id,
                          });
                          setFingerprint({
                            deviceUserId: res.data.data.deviceUserId,
                            registered: true,
                          });
                          setFpMessage({
                            type: 'success',
                            text: `Registered as Device User #${res.data.data.deviceUserId} on ${res.data.data.deviceName}. Now have the member enroll their fingerprint at the device.`,
                          });
                        } catch (error) {
                          setFpMessage({
                            type: 'error',
                            text: error.response?.data?.message || 'Failed to register on device. Is the device online?',
                          });
                        } finally {
                          setRegistering(false);
                        }
                      }}
                      disabled={registering}
                      className="px-5 py-2.5 bg-slate-900 text-white text-sm font-medium rounded-[5px] hover:bg-slate-800 disabled:opacity-50 transition-all duration-200 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
                    >
                      {registering ? 'Registering...' : 'Register Fingerprint'}
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">
                    No devices configured. Add a device in the Device Management page first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Membership Details */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 dark:text-slate-200">
              Membership Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">
                  Join Date *
                </label>
                <input
                  type="date"
                  name="joinDate"
                  value={formData.joinDate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">
                  Package *
                </label>
                <select
                  name="packageId"
                  value={formData.packageId}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  required
                >
                  <option value="">Select Package</option>
                  {packages.map((pkg) => (
                    <option key={pkg._id} value={pkg._id}>
                      {pkg.name} - ৳{formData.gender === 'Female' ? pkg.priceLadies : pkg.priceGents} ({pkg.isLifetime ? 'Lifetime' : `${pkg.duration} days`})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 mb-6 dark:text-slate-200">
              Payment Options
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3 dark:text-slate-300">
                  Add Payment
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="full"
                      checked={formData.paymentType === 'full'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-slate-200 rounded-[5px] cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 dark:bg-green-900/30 transition-all duration-200 hover:border-green-300 dark:border-slate-700">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">Pay Full Due</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Pay remaining ৳{formData.dueAmount || 0}</div>
                      </div>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="partial"
                      checked={formData.paymentType === 'partial'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-slate-200 rounded-[5px] cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:bg-blue-900/30 transition-all duration-200 hover:border-blue-300 dark:border-slate-700">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">Partial Payment</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Pay part of due amount</div>
                      </div>
                    </div>
                  </label>
                  <label className="relative">
                    <input
                      type="radio"
                      name="paymentType"
                      value="none"
                      checked={!formData.paymentType || formData.paymentType === 'none'}
                      onChange={handleChange}
                      className="sr-only peer"
                    />
                    <div className="p-4 border-2 border-slate-200 rounded-[5px] cursor-pointer peer-checked:border-slate-500 peer-checked:bg-slate-50 transition-all duration-200 hover:border-slate-200 dark:border-slate-700">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-slate-800 dark:text-slate-200">No Payment</div>
                        <div className="text-sm text-slate-600 dark:text-slate-400">Update info only</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {(formData.paymentType === 'partial' || formData.paymentType === 'full') && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2 dark:text-slate-300">
                    Payment Amount *
                  </label>
                  <input
                    type="number"
                    name="additionalPayment"
                    value={formData.additionalPayment || ''}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    max={formData.dueAmount || 0}
                    className="w-full px-4 py-3 border border-slate-200 rounded-[5px] focus:ring-2 focus:ring-slate-300 focus:border-transparent transition-all duration-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    placeholder="Enter payment amount"
                    required={formData.paymentType === 'partial' || formData.paymentType === 'full'}
                  />
                  <p className="text-sm text-slate-600 mt-1 dark:text-slate-400">
                    Maximum amount: ৳{formData.dueAmount || 0}
                  </p>
                </div>
              )}
            </div>
          </div>
          {formData.packageId && (
            <div className="bg-slate-50 rounded-[5px] p-6 border border-slate-200 dark:bg-slate-950 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 dark:text-slate-200">
                Membership Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="bg-white p-4 rounded-[5px] dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Expiry Date:</span>
                  <span className="font-semibold text-slate-800 ml-2 dark:text-slate-200">
                    {formData.joinDate && packages.find(p => p._id === formData.packageId) ?
                      new Date(new Date(formData.joinDate).getTime() + packages.find(p => p._id === formData.packageId).duration * 24 * 60 * 60 * 1000).toLocaleDateString()
                      : 'Select join date and package'
                    }
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px] dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Package Price:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400 ml-2">
                    ৳{(() => { const p = packages.find(p => p._id === formData.packageId); return p ? (formData.gender === 'Female' ? p.priceLadies : p.priceGents) : 0; })()}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px] dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Paid Amount:</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400 ml-2">
                    ৳{formData.paidAmount || 0}
                  </span>
                </div>
                <div className="bg-white p-4 rounded-[5px] dark:bg-slate-900">
                  <span className="text-slate-500 dark:text-slate-400">Due Amount:</span>
                  <span className={`font-semibold ml-2 ${formData.dueAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ৳{formData.dueAmount || 0}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => navigate('/members')}
              className="px-6 py-3 border border-slate-200 text-slate-700 rounded-[5px] hover:bg-slate-50 transition-all duration-200 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-slate-900 text-white rounded-[5px] hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              {submitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating Member...
                </div>
              ) : (
                'Update Member'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMember;
