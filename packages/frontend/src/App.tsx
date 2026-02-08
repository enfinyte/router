import type { Component } from 'solid-js';
import { Show } from 'solid-js';
import { createAuthClient } from "better-auth/solid";
import { AuthPage } from './AuthPage';
import { Dashboard } from './Dashboard';

export const authClient = createAuthClient({
  baseURL: "http://localhost:8000"
});

const App: Component = () => {
  const session = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
  };

  return (
    <Show
      when={session().data?.user}
      fallback={<AuthPage />}
    >
      <Dashboard
        user={{
          name: session().data?.user?.name,
          email: session().data?.user?.email,
        }}
        onSignOut={handleSignOut}
      />
    </Show>
  );
};

export default App;
