const API_URL = 'http://localhost:5000/api';

async function readResponse(response) {
  let data;
  try {
    data = await response.json();
  } catch (error) {
    data = { message: 'Request failed' };
  }
  if (!response.ok) {
    const requestError = new Error(data.message || 'Request failed');
    requestError.status = response.status;
    requestError.data = data;
    throw requestError;
  }
  return data;
}

function getToken() {
  return localStorage.getItem('outreachToken');
}

async function login(event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const message = document.getElementById('loginMessage');

  message.textContent = 'Signing in...';

  try {
    let response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    let data = await readResponse(response).catch(async (error) => {
      if (error.status === 409 && error.data.data?.workspaces) {
        const workspaces = error.data.data.workspaces;
        const choices = workspaces.map((workspace, index) => `${index + 1}. ${workspace.name}`).join('\n');
        const selected = prompt(`Select a workspace:\n${choices}`);
        const index = Number(selected) - 1;
        if (!workspaces[index]) throw new Error('No workspace selected');

        response = await fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, workspaceId: workspaces[index].id })
        });
        return readResponse(response);
      }
      throw error;
    });

    localStorage.setItem('outreachToken', data.data.token);
    localStorage.setItem('outreachUser', JSON.stringify(data.data.user));
    if (data.data.workspace) {
      localStorage.setItem('outreachWorkspace', JSON.stringify(data.data.workspace));
    }
    window.location.href = 'dashboard.html';
  } catch (error) {
    message.textContent = error.message;
  }
}

async function loadDashboard() {
  if (!getToken()) {
    window.location.href = 'login.html';
    return;
  }

  const workspace = JSON.parse(localStorage.getItem('outreachWorkspace') || 'null');
  if (!workspace) return;

  try {
    const response = await fetch(`${API_URL}/dashboard/summary`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
        'X-Workspace-ID': workspace.id
      }
    });
    const data = await readResponse(response);

    document.getElementById('totalContacts').textContent = data.data.totalContacts;
    document.getElementById('activeCampaigns').textContent = data.data.activeCampaigns;
    document.getElementById('deliveryRate').textContent = `${data.data.deliveryRate}%`;
  } catch (error) {
    const dashboardMessage = document.getElementById('dashboardMessage');
    if (dashboardMessage) dashboardMessage.textContent = error.message;
  }

  const logoutForm = document.getElementById('logoutForm');
  if (logoutForm) {
    logoutForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      try {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` }
        });
      } finally {
        localStorage.removeItem('outreachToken');
        localStorage.removeItem('outreachUser');
        localStorage.removeItem('outreachWorkspace');
        window.location.href = 'login.html';
      }
    });
  }
}

const loginForm = document.getElementById('loginForm');
if (loginForm) loginForm.addEventListener('submit', login);

if (document.getElementById('dashboardMessage')) loadDashboard();
