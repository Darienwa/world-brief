// World Brief launcher: starts the Node server hidden, opens the browser,
// and sits in the system tray (open / collect now / logs / quit).
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Threading;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("全球要闻 World Brief")]
[assembly: System.Reflection.AssemblyProduct("World Brief")]
[assembly: System.Reflection.AssemblyVersion("1.0.0.0")]

static class Launcher
{
    const string Url = "http://localhost:4318/";
    static Process server;
    static NotifyIcon tray;
    static string root, logFile;

    [STAThread]
    static void Main()
    {
        root = AppDomain.CurrentDomain.BaseDirectory;
        logFile = Path.Combine(root, "data", "server.log");

        bool first;
        using (var mutex = new Mutex(true, "WorldBrief.Launcher", out first))
        {
            // Second click while running: just bring up the page.
            if (!first || Ping()) { OpenBrowser(); return; }

            Application.EnableVisualStyles();
            if (!StartServer()) return;

            tray = new NotifyIcon
            {
                Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath),
                Text = "全球要闻（运行中）",
                Visible = true,
                ContextMenuStrip = BuildMenu(),
            };
            tray.DoubleClick += (s, e) => OpenBrowser();

            // Wait for the server to answer before opening the page.
            var timer = new System.Windows.Forms.Timer { Interval = 400 };
            int tries = 0;
            timer.Tick += (s, e) =>
            {
                if (Ping()) { timer.Stop(); OpenBrowser(); tray.ShowBalloonTip(3000, "全球要闻已启动", "双击托盘图标可随时打开，右键可退出。", ToolTipIcon.Info); }
                else if (server.HasExited || ++tries > 60)
                {
                    timer.Stop();
                    MessageBox.Show("服务启动失败，请查看日志：\n" + logFile, "全球要闻", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    Quit();
                }
            };
            timer.Start();
            Application.Run();
        }
    }

    static ContextMenuStrip BuildMenu()
    {
        var m = new ContextMenuStrip();
        m.Items.Add("打开全球要闻", null, (s, e) => OpenBrowser()).Font = new Font(m.Font, FontStyle.Bold);
        m.Items.Add("立即采集", null, (s, e) => CollectNow());
        m.Items.Add("打开数据文件夹", null, (s, e) => Process.Start("explorer.exe", "\"" + root + "\""));
        m.Items.Add("查看日志", null, (s, e) => { if (File.Exists(logFile)) Process.Start("notepad.exe", "\"" + logFile + "\""); });
        m.Items.Add(new ToolStripSeparator());
        m.Items.Add("退出", null, (s, e) => Quit());
        return m;
    }

    static string FindNode()
    {
        // Prefer a node.exe bundled next to the launcher, then PATH, then common install dirs.
        var local = Path.Combine(root, "runtime", "node.exe");
        if (File.Exists(local)) return local;
        foreach (var dir in (Environment.GetEnvironmentVariable("PATH") ?? "").Split(';'))
        {
            try { var p = Path.Combine(dir.Trim().Trim('"'), "node.exe"); if (File.Exists(p)) return p; } catch { }
        }
        var localApp = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        foreach (var p in new[] { @"C:\Program Files\nodejs\node.exe", Path.Combine(localApp, @"Programs\nodejs\node.exe") })
            if (File.Exists(p)) return p;
        return null;
    }

    static bool StartServer()
    {
        var node = FindNode();
        if (node == null)
        {
            MessageBox.Show("没有找到 Node.js（node.exe）。请安装 Node.js 18 以上版本后再试。", "全球要闻", MessageBoxButtons.OK, MessageBoxIcon.Error);
            return false;
        }
        Directory.CreateDirectory(Path.GetDirectoryName(logFile));
        var psi = new ProcessStartInfo(node, "server.mjs")
        {
            WorkingDirectory = root,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
        };
        // Optional proxy: put e.g. "http://127.0.0.1:7890" in proxy.txt next to the exe.
        var proxyFile = Path.Combine(root, "proxy.txt");
        if (File.Exists(proxyFile))
        {
            var proxy = File.ReadAllText(proxyFile).Trim();
            if (proxy.Length > 0)
            {
                psi.EnvironmentVariables["HTTPS_PROXY"] = proxy;
                psi.EnvironmentVariables["HTTP_PROXY"] = proxy;
                psi.EnvironmentVariables["NODE_USE_ENV_PROXY"] = "1";
            }
        }
        psi.EnvironmentVariables["WORLDBRIEF_PARENT_PID"] = Process.GetCurrentProcess().Id.ToString();
        psi.StandardOutputEncoding = System.Text.Encoding.UTF8;
        psi.StandardErrorEncoding = System.Text.Encoding.UTF8;

        var log = new StreamWriter(logFile, true, new System.Text.UTF8Encoding(false)) { AutoFlush = true };
        server = new Process { StartInfo = psi, EnableRaisingEvents = true };
        DataReceivedEventHandler write = (s, e) => { if (e.Data != null) lock (log) log.WriteLine(e.Data); };
        server.OutputDataReceived += write;
        server.ErrorDataReceived += write;
        server.Start();
        server.BeginOutputReadLine();
        server.BeginErrorReadLine();
        return true;
    }

    static bool Ping()
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create(Url + "api/meta");
            req.Timeout = 800;
            req.Proxy = null;
            using (var res = (HttpWebResponse)req.GetResponse()) return res.StatusCode == HttpStatusCode.OK;
        }
        catch { return false; }
    }

    static void CollectNow()
    {
        tray.ShowBalloonTip(2000, "开始采集", "正在搜集全球要闻…", ToolTipIcon.None);
        ThreadPool.QueueUserWorkItem(_ =>
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(Url + "api/collect");
                req.Method = "POST"; req.Timeout = 120000; req.Proxy = null; req.ContentLength = 0;
                using (req.GetResponse()) { }
                tray.ShowBalloonTip(3000, "采集完成", "打开全球要闻查看最新内容。", ToolTipIcon.Info);
            }
            catch (Exception ex) { tray.ShowBalloonTip(3000, "采集失败", ex.Message, ToolTipIcon.Warning); }
        });
    }

    static void OpenBrowser()
    {
        try { Process.Start(new ProcessStartInfo(Url) { UseShellExecute = true }); } catch { }
    }

    static void Quit()
    {
        try { if (server != null && !server.HasExited) server.Kill(); } catch { }
        if (tray != null) tray.Visible = false;
        Application.Exit();
        Environment.Exit(0);
    }
}
