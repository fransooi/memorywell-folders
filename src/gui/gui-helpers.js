#!/usr/bin/env node

const { execSync } = require('child_process');
const os = require('os');

function detectPlatform() {
  const platform = os.platform();
  if (platform === 'darwin') return 'macos';
  if (platform === 'linux') return 'linux';
  if (platform === 'win32') return 'windows';
  return 'unsupported';
}

function hasZenity() {
  try {
    execSync('which zenity', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasKdialog() {
  try {
    execSync('which kdialog', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function showDialog(title, message, type = 'info') {
  const platform = detectPlatform();
  
  if (platform === 'macos') {
    const icon = type === 'error' ? 'stop' : type === 'warning' ? 'caution' : 'note';
    const script = `display dialog "${message}" with title "${title}" with icon ${icon} buttons {"OK"} default button "OK"`;
    try {
      execSync(`osascript -e '${script}'`, { stdio: 'ignore' });
    } catch (e) {
      console.log(`${title}: ${message}`);
    }
  } else if (platform === 'windows') {
    const iconType = type === 'error' ? 'Error' : type === 'warning' ? 'Warning' : 'Information';
    const escapedMsg = message.replace(/"/g, '""').replace(/\n/g, '`n');
    const escapedTitle = title.replace(/"/g, '""');
    const ps = `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show("${escapedMsg}", "${escapedTitle}", 'OK', '${iconType}')`;
    try {
      execSync(`powershell -Command "${ps}"`, { stdio: 'ignore' });
    } catch (e) {
      console.log(`${title}: ${message}`);
    }
  } else if (platform === 'linux') {
    if (hasZenity()) {
      const zenityType = type === 'error' ? '--error' : type === 'warning' ? '--warning' : '--info';
      try {
        execSync(`zenity ${zenityType} --title="${title}" --text="${message}"`, { stdio: 'ignore' });
      } catch (e) {
        console.log(`${title}: ${message}`);
      }
    } else {
      console.log(`${title}: ${message}`);
    }
  } else {
    console.log(`${title}: ${message}`);
  }
}

function getTextInput(title, prompt, defaultValue = '') {
  const platform = detectPlatform();
  
  if (platform === 'macos') {
    const script = `display dialog "${prompt}" with title "${title}" default answer "${defaultValue}" buttons {"Cancel", "OK"} default button "OK"`;
    try {
      const result = execSync(`osascript -e '${script}'`).toString().trim();
      const match = result.match(/text returned:(.+)$/);
      return match ? match[1].trim() : '';
    } catch (e) {
      return null;
    }
  } else if (platform === 'windows') {
    const escapedPrompt = prompt.replace(/"/g, '""');
    const escapedTitle = title.replace(/"/g, '""');
    const escapedDefault = defaultValue.replace(/"/g, '""');
    const ps = `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox("${escapedPrompt}", "${escapedTitle}", "${escapedDefault}")`;
    try {
      const result = execSync(`powershell -Command "${ps}"`).toString().trim();
      return result || null;
    } catch (e) {
      return null;
    }
  } else if (platform === 'linux' && hasZenity()) {
    try {
      const result = execSync(`zenity --entry --title="${title}" --text="${prompt}" --entry-text="${defaultValue}"`).toString().trim();
      return result || null;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

function showListDialog(title, prompt, items) {
  const platform = detectPlatform();
  
  if (platform === 'macos') {
    const itemsList = items.map(item => `"${item}"`).join(', ');
    const script = `choose from list {${itemsList}} with title "${title}" with prompt "${prompt}"`;
    try {
      const result = execSync(`osascript -e '${script}'`).toString().trim();
      if (result === 'false') return null;
      return result;
    } catch (e) {
      return null;
    }
  } else if (platform === 'linux' && hasZenity()) {
    try {
      const itemsStr = items.join('\n');
      const result = execSync(`echo "${itemsStr}" | zenity --list --title="${title}" --text="${prompt}" --column="Archives"`, { shell: '/bin/bash' }).toString().trim();
      return result || null;
    } catch (e) {
      return null;
    }
  }
  
  return null;
}

function showYesNoDialog(title, message) {
  const platform = detectPlatform();
  
  if (platform === 'macos') {
    const script = `display dialog "${message}" with title "${title}" buttons {"No", "Yes"} default button "Yes"`;
    try {
      const result = execSync(`osascript -e '${script}'`).toString().trim();
      return result.includes('Yes');
    } catch (e) {
      return false;
    }
  } else if (platform === 'windows') {
    const escapedMsg = message.replace(/"/g, '""');
    const escapedTitle = title.replace(/"/g, '""');
    const ps = `Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show("${escapedMsg}", "${escapedTitle}", 'YesNo', 'Question')`;
    try {
      const result = execSync(`powershell -Command "${ps}"`).toString().trim();
      return result.includes('Yes');
    } catch (e) {
      return false;
    }
  } else if (platform === 'linux' && hasZenity()) {
    try {
      execSync(`zenity --question --title="${title}" --text="${message}"`, { stdio: 'ignore' });
      return true;
    } catch (e) {
      return false;
    }
  }
  
  return false;
}

module.exports = {
  detectPlatform,
  showDialog,
  getTextInput,
  showListDialog,
  showYesNoDialog,
  hasZenity,
  hasKdialog
};
