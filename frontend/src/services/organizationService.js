import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// ============= Workspace APIs =============

export const getWorkspaces = async () => {
  const response = await axios.get(`${API}/organizations/workspaces`);
  return response.data;
};

// ============= Organization CRUD APIs =============

export const createOrganization = async (data) => {
  const response = await axios.post(`${API}/organizations`, data);
  return response.data;
};

export const convertToOrganization = async (data) => {
  const response = await axios.post(`${API}/organizations/convert`, data);
  return response.data;
};

export const getOrganizations = async () => {
  const response = await axios.get(`${API}/organizations`);
  return response.data;
};

export const getOrganization = async (orgId) => {
  const response = await axios.get(`${API}/organizations/${orgId}`);
  return response.data;
};

export const updateOrganization = async (orgId, data) => {
  const response = await axios.patch(`${API}/organizations/${orgId}`, data);
  return response.data;
};

export const deleteOrganization = async (orgId) => {
  const response = await axios.delete(`${API}/organizations/${orgId}`);
  return response.data;
};

// ============= Membership Management APIs =============

export const getMembers = async (orgId) => {
  const response = await axios.get(`${API}/organizations/${orgId}/members`);
  return response.data;
};

export const inviteMember = async (orgId, data) => {
  const response = await axios.post(`${API}/organizations/${orgId}/members`, data);
  return response.data;
};

export const updateMemberRole = async (orgId, memberId, data) => {
  const response = await axios.patch(`${API}/organizations/${orgId}/members/${memberId}`, data);
  return response.data;
};

export const removeMember = async (orgId, memberId) => {
  const response = await axios.delete(`${API}/organizations/${orgId}/members/${memberId}`);
  return response.data;
};

export const leaveOrganization = async (orgId) => {
  const response = await axios.post(`${API}/organizations/${orgId}/leave`);
  return response.data;
};

export const transferOwnership = async (orgId, newOwnerId) => {
  const response = await axios.post(`${API}/organizations/${orgId}/transfer-ownership`, {
    new_owner_id: newOwnerId
  });
  return response.data;
};
