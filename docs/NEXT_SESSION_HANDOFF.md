# Next session handoff

Last updated: 2026-09-19 10:56 +03:00.

## Current state

The local Taskroom DevOps lab is working end to end:

```text
GitHub change
-> Jenkins
-> backend tests
-> frontend build
-> SonarQube analysis
-> SonarQube quality gate
-> Docker Hub push
-> Minikube deploy
-> Kubernetes rollout checks
-> frontend/API/metrics smoke test
```

The rebuild-before-cloud guide has been created:

```text
D:\devops-k8s-project\docs\Taskroom_Rebuild_From_Scratch_Guide.md
```

The matching Obsidian checklist was created:

```text
D:\Obsidian\03 Development\Taskroom Rebuild From Scratch.md
```

## Dirty repo state to remember

Current Git status showed:

```text
 M README.md
 M "output of jenkins.txt"
?? docs/Taskroom_Rebuild_From_Scratch_Guide.md
```

`README.md` and `docs/Taskroom_Rebuild_From_Scratch_Guide.md` are intentional
changes from the rebuild-guide work.

`output of jenkins.txt` was already modified separately. Do not include it in
the rebuild-guide commit unless the user explicitly wants to commit console
output.

Safe commit command for the guide:

```powershell
cd D:\devops-k8s-project
git add README.md docs\Taskroom_Rebuild_From_Scratch_Guide.md
git commit -m "add taskroom rebuild from scratch guide"
git push
```

## First thing to do next

Open the rebuild guide and start Phase 1 in a new folder:

```powershell
cd D:\
mkdir taskroom-devops-lab
cd taskroom-devops-lab
git init
```

Use the old repo only as a reference. Do not copy secrets or generated runtime
state.

## Prompt for another AI

Use this prompt if continuing with another AI:

```text
I am rebuilding my local Taskroom DevOps portfolio lab from scratch before
moving to cloud. The old working repo is D:\devops-k8s-project, and the rebuild
guide is D:\devops-k8s-project\docs\Taskroom_Rebuild_From_Scratch_Guide.md.

Help me follow the guide one phase at a time. Do not skip ahead. Do not suggest
cloud yet. The target chain is:

GitHub change -> Jenkins -> backend tests -> frontend build -> SonarQube
analysis -> quality gate -> Docker Hub -> Minikube deploy -> smoke test.

Before each phase, tell me the exact goal. After each phase, help me verify it
with commands and record the evidence in Obsidian.
```

## Safety rules

- Do not run `vagrant destroy`.
- Do not run `minikube delete`.
- Do not commit `.env`, kubeconfigs, Jenkins passwords, Docker credentials,
  SSH private keys, SonarQube tokens, or Kubernetes Secret exports.
- Preserve working VMs and existing repo state.
- Keep the rebuild focused on repeatability and evidence, not adding new tools.

