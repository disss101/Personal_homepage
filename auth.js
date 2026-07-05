(function () {
  const config = window.GIGOTON_SUPABASE || {};
  const isConfigured = Boolean(config.url && config.anonKey && !config.url.includes("YOUR_"));
  const client = isConfigured && window.supabase
    ? window.supabase.createClient(config.url, config.anonKey)
    : null;

  let currentUser = null;
  let modal;
  let emailInput;
  let authMessage;
  let authButton;
  let userBadge;
  let likeButton;
  let likeCountNode;
  let commentForm;
  let commentInput;
  let commentList;

  const article = document.querySelector(".article-page[data-article-id]");
  const articleId = article ? article.dataset.articleId : "";

  function displayName(user) {
    if (!user) return "";
    return user.user_metadata?.user_name
      || user.user_metadata?.full_name
      || user.email
      || "已登录用户";
  }

  function setMessage(text, type = "info") {
    if (!authMessage) return;
    authMessage.textContent = text;
    authMessage.dataset.type = type;
  }

  function openModal() {
    modal.hidden = false;
    document.body.classList.add("modal-open");
    if (emailInput) emailInput.focus();
  }

  function closeModal() {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  function buildAuthUi() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    const authArea = document.createElement("div");
    authArea.className = "auth-area";
    authArea.innerHTML = `
      <span class="user-badge" hidden></span>
      <button class="auth-trigger" type="button">登录 / 注册</button>
    `;
    header.appendChild(authArea);

    userBadge = authArea.querySelector(".user-badge");
    authButton = authArea.querySelector(".auth-trigger");
    authButton.addEventListener("click", async () => {
      if (currentUser) {
        await client.auth.signOut();
        return;
      }
      openModal();
    });

    modal = document.createElement("div");
    modal.className = "auth-modal";
    modal.hidden = true;
    modal.innerHTML = `
      <div class="auth-backdrop" data-close-auth></div>
      <section class="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="authTitle">
        <button class="auth-close" type="button" aria-label="关闭登录窗口" data-close-auth>×</button>
        <p class="eyebrow">Account</p>
        <h2 id="authTitle">登录 Gigoton's Blog</h2>
        <p class="auth-hint">登录后可以给文章点赞和留言。</p>
        <button class="auth-provider" type="button" data-github-login>使用 GitHub 登录</button>
        <form class="email-login-form">
          <label>
            <span>邮箱登录</span>
            <input type="email" name="email" placeholder="you@example.com" autocomplete="email" required>
          </label>
          <button class="auth-provider secondary-provider" type="submit">发送登录邮件</button>
        </form>
        <p class="auth-message" data-type="info"></p>
      </section>
    `;
    document.body.appendChild(modal);

    emailInput = modal.querySelector("input[type='email']");
    authMessage = modal.querySelector(".auth-message");

    modal.querySelectorAll("[data-close-auth]").forEach((node) => {
      node.addEventListener("click", closeModal);
    });

    modal.querySelector("[data-github-login]").addEventListener("click", async () => {
      if (!client) {
        setMessage("还没配置 Supabase，先填 supabase-config.js。", "error");
        return;
      }
      const { error } = await client.auth.signInWithOAuth({
        provider: "github",
        options: { redirectTo: window.location.href }
      });
      if (error) setMessage(error.message, "error");
    });

    modal.querySelector(".email-login-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!client) {
        setMessage("还没配置 Supabase，先填 supabase-config.js。", "error");
        return;
      }
      const email = emailInput.value.trim();
      const { error } = await client.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.href,
          shouldCreateUser: true
        }
      });
      if (error) {
        setMessage(error.message, "error");
      } else {
        setMessage("登录邮件已发送，去邮箱点一下链接就行。", "success");
      }
    });

    if (!isConfigured) {
      setMessage("Supabase 还没配置，登录、点赞和留言会先显示为待配置状态。", "error");
    }
  }

  function updateAuthUi() {
    if (!authButton || !userBadge) return;
    if (currentUser) {
      userBadge.hidden = false;
      userBadge.textContent = displayName(currentUser);
      authButton.textContent = "退出";
    } else {
      userBadge.hidden = true;
      userBadge.textContent = "";
      authButton.textContent = "登录 / 注册";
    }
  }

  function buildEngagementUi() {
    if (!article) return;
    const panel = document.createElement("section");
    panel.className = "engagement-panel";
    panel.innerHTML = `
      <div class="engagement-head">
        <div>
          <p class="eyebrow">Discussion</p>
          <h2>点赞和留言</h2>
        </div>
        <button class="like-button" type="button">
          <span aria-hidden="true">♡</span>
          <strong>点赞</strong>
          <em>0</em>
        </button>
      </div>
      <form class="comment-form">
        <label>
          <span>留言</span>
          <textarea rows="4" maxlength="600" placeholder="写点想法，登录后可以发送。"></textarea>
        </label>
        <button class="button primary comment-submit" type="submit">发布留言</button>
      </form>
      <div class="comments-list" aria-live="polite"></div>
    `;
    article.appendChild(panel);

    likeButton = panel.querySelector(".like-button");
    likeCountNode = panel.querySelector(".like-button em");
    commentForm = panel.querySelector(".comment-form");
    commentInput = panel.querySelector("textarea");
    commentList = panel.querySelector(".comments-list");

    likeButton.addEventListener("click", toggleLike);
    commentForm.addEventListener("submit", submitComment);
  }

  async function refreshLikeState() {
    if (!client || !articleId || !likeButton) return;
    const { count } = await client
      .from("article_likes")
      .select("*", { count: "exact", head: true })
      .eq("article_id", articleId);

    likeCountNode.textContent = String(count || 0);

    if (!currentUser) {
      likeButton.classList.remove("liked");
      return;
    }

    const { data } = await client
      .from("article_likes")
      .select("article_id")
      .eq("article_id", articleId)
      .eq("user_id", currentUser.id)
      .maybeSingle();

    likeButton.classList.toggle("liked", Boolean(data));
    likeButton.querySelector("span").textContent = data ? "♥" : "♡";
  }

  async function toggleLike() {
    if (!client) {
      openModal();
      setMessage("先配置 Supabase，点赞才会写入数据库。", "error");
      return;
    }
    if (!currentUser) {
      openModal();
      setMessage("登录后才能点赞。", "info");
      return;
    }

    const liked = likeButton.classList.contains("liked");
    if (liked) {
      await client
        .from("article_likes")
        .delete()
        .eq("article_id", articleId)
        .eq("user_id", currentUser.id);
    } else {
      await client
        .from("article_likes")
        .insert({ article_id: articleId, user_id: currentUser.id });
    }
    await refreshLikeState();
  }

  async function refreshComments() {
    if (!commentList) return;
    if (!client || !articleId) {
      commentList.innerHTML = `<p class="comment-empty">配置 Supabase 后，这里会显示真实留言。</p>`;
      return;
    }

    const { data, error } = await client
      .from("article_comments")
      .select("id, author_name, body, created_at")
      .eq("article_id", articleId)
      .order("created_at", { ascending: false });

    if (error) {
      commentList.innerHTML = `<p class="comment-empty">留言加载失败：${error.message}</p>`;
      return;
    }

    if (!data || data.length === 0) {
      commentList.innerHTML = `<p class="comment-empty">还没有留言。</p>`;
      return;
    }

    commentList.innerHTML = "";
    data.forEach((comment) => {
      const item = document.createElement("article");
      item.className = "comment-item";

      const name = document.createElement("strong");
      name.textContent = comment.author_name || "匿名用户";

      const time = document.createElement("time");
      time.dateTime = comment.created_at;
      time.textContent = new Date(comment.created_at).toLocaleString("zh-CN");

      const body = document.createElement("p");
      body.textContent = comment.body;

      item.append(name, time, body);
      commentList.appendChild(item);
    });
  }

  async function submitComment(event) {
    event.preventDefault();
    if (!client) {
      openModal();
      setMessage("先配置 Supabase，留言才会写入数据库。", "error");
      return;
    }
    if (!currentUser) {
      openModal();
      setMessage("登录后才能留言。", "info");
      return;
    }

    const body = commentInput.value.trim();
    if (!body) return;

    const { error } = await client.from("article_comments").insert({
      article_id: articleId,
      user_id: currentUser.id,
      author_name: displayName(currentUser),
      body
    });

    if (!error) {
      commentInput.value = "";
      await refreshComments();
    }
  }

  async function initAuth() {
    buildAuthUi();
    buildEngagementUi();
    if (!client) {
      updateAuthUi();
      await refreshComments();
      return;
    }

    const { data } = await client.auth.getSession();
    currentUser = data.session?.user || null;
    updateAuthUi();
    await refreshLikeState();
    await refreshComments();

    client.auth.onAuthStateChange(async (_event, session) => {
      currentUser = session?.user || null;
      updateAuthUi();
      await refreshLikeState();
      await refreshComments();
    });
  }

  document.addEventListener("DOMContentLoaded", initAuth);
})();
