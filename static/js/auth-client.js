// Create a Better Auth client
const authClient = createAuthClient({
    baseURL: window.location.origin // Use the same domain
  });
  
  // Export methods for use in other scripts
  const { signIn, signUp, signOut, useSession } = authClient;
  
  // Check if user is logged in
  async function checkAuth() {
    const session = await authClient.getSession();
    if (session) {
      // User is logged in
      document.querySelectorAll('.auth-logged-in').forEach(el => {
        el.style.display = 'block';
      });
      document.querySelectorAll('.auth-logged-out').forEach(el => {
        el.style.display = 'none';
      });
      
      // Set user name if available
      const userNameElements = document.querySelectorAll('.auth-user-name');
      if (userNameElements.length > 0 && session.user) {
        userNameElements.forEach(el => {
          el.textContent = session.user.name || session.user.email;
        });
      }
    } else {
      // User is not logged in
      document.querySelectorAll('.auth-logged-in').forEach(el => {
        el.style.display = 'none';
      });
      document.querySelectorAll('.auth-logged-out').forEach(el => {
        el.style.display = 'block';
      });
    }
  }
  
  // Run on page load
  document.addEventListener('DOMContentLoaded', checkAuth);
  