![Logo](/images/icon.png)
# Steam Switch Electron

Basic electron application to switch between multiple steam accounts. There are still various problems that I need to iron out, nothing that affects the security of the application, just the running e.g. it currently doesn't remember the account password on the steam client, for this registry tweaks need to be made. 

AES-256 is to encrypt the passwords of your account, with a SHA-2 key created from a multiple sources: your hardware ID, a unique ID generated on first launch and and a pseudo random sequence generated upon each addition of an account.

As is the nature of all 2-way encryption it is inherently vulnerable in that and what goes in can be retrievable, indeed the application would not function without that being possible. But I have done what I can to ensure it is to a large degree time consuming and perhaps difficult to brute-force, though someone with access to your system, enough knowledge about the application could probably do this rather quickly without brute-force.

## Notes

It is my first Electron app and really just an excuse to learn the framework. 

It only works on Windows, I really only thought of designing it for Windows. Probably not a great idea but, hey ho.

It doesn't connect to the Internet in anyway, so you can add it to your firewall without issue and I advise that you do so that you too are sure. 

To delete all traces of this from your system beyond  deleting the application folder, you will want to remove the directory below.

	C:\Users\<username>\Documents\SteamSwitch

## Images
![Main App Screen](/images/MainScreen.png)
![Tray Icon Menu](/images/TrayMenu.png)
![Add Account Screen](/images/AddScreen.png)
![Edit Account Screen](/images/EditScreen.png)


## Todos
 - Remember checkbox still doesn't work, as I need to look into the registry tweaks required to make it work

 - Basic error checking and messaging

 - Testing from a new system

 - Maybe a masterpass system to be used with the key so that not all components used to form a key are available on system with a deep enough search

 - Other stuff listed in main.js

## License

[CC0 1.0 (Public Domain)](LICENSE.md)
