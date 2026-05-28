# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests/verify_swipe_v2.spec.js >> verify expanded player and swipe
- Location: tests/verify_swipe_v2.spec.js:4:1

# Error details

```
TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
Call log:
  - waiting for locator('div.z-\\[220\\]').first() to be visible

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6] [cursor=pointer]:
        - generic [ref=e7]: VibeOn
        - generic [ref=e8]: by WENODH
      - button "Settings" [ref=e10] [cursor=pointer]:
        - img "Logo" [ref=e11]
    - generic [ref=e13]:
      - textbox "Search for songs, albums, artists..." [ref=e14]
      - img [ref=e15]
  - main [ref=e18]:
    - generic [ref=e20]:
      - generic [ref=e23]:
        - 'heading "Made For You: Daily Mix" [level=2] [ref=e24]'
        - generic [ref=e25]:
          - button [ref=e26] [cursor=pointer]:
            - img [ref=e27]
          - generic [ref=e30]:
            - generic [ref=e31] [cursor=pointer]:
              - generic [ref=e32]:
                - img "Ee Manase Se Se" [ref=e33]
                - generic [ref=e35]: ▶
              - paragraph [ref=e37]: Ee Manase Se Se
            - generic [ref=e38] [cursor=pointer]:
              - generic [ref=e39]:
                - img "Boom Boom" [ref=e40]
                - generic [ref=e42]: ▶
              - paragraph [ref=e44]: Boom Boom
            - generic [ref=e45] [cursor=pointer]:
              - generic [ref=e46]:
                - img "Priya Raagale" [ref=e47]
                - generic [ref=e49]: ▶
              - paragraph [ref=e51]: Priya Raagale
            - generic [ref=e52] [cursor=pointer]:
              - generic [ref=e53]:
                - img "Peelings (Telugu)" [ref=e54]
                - generic [ref=e56]: ▶
              - paragraph [ref=e58]: Peelings (Telugu)
            - generic [ref=e59] [cursor=pointer]:
              - generic [ref=e60]:
                - img "Sarkaru Raa" [ref=e61]
                - generic [ref=e63]: ▶
              - paragraph [ref=e65]: Sarkaru Raa
            - generic [ref=e66] [cursor=pointer]:
              - generic [ref=e67]:
                - img "Singari" [ref=e68]
                - generic [ref=e70]: ▶
              - paragraph [ref=e72]: Singari
            - generic [ref=e73] [cursor=pointer]:
              - generic [ref=e74]:
                - img "Firestorm" [ref=e75]
                - generic [ref=e77]: ▶
              - paragraph [ref=e79]: Firestorm
            - generic [ref=e80] [cursor=pointer]:
              - generic [ref=e81]:
                - img "Chikiri Chikiri (From &quot;Peddi&quot;) - Telugu" [ref=e82]
                - generic [ref=e84]: ▶
              - paragraph [ref=e86]: Chikiri Chikiri (From "Peddi") - Telugu
            - generic [ref=e87] [cursor=pointer]:
              - generic [ref=e88]:
                - img "Mamidi Konala Meena Mabbulemo Nilichinayi" [ref=e89]
                - generic [ref=e91]: ▶
              - paragraph [ref=e93]: Mamidi Konala Meena Mabbulemo Nilichinayi
            - generic [ref=e94] [cursor=pointer]:
              - generic [ref=e95]:
                - img "Rai Rai Raa Raa (From &quot;Peddi&quot;) - Telugu" [ref=e96]
                - generic [ref=e98]: ▶
              - paragraph [ref=e100]: Rai Rai Raa Raa (From "Peddi") - Telugu
          - button [ref=e101] [cursor=pointer]:
            - img [ref=e102]
      - generic [ref=e106]:
        - heading "Recently Played Songs" [level=2] [ref=e107]
        - generic [ref=e108]:
          - button [ref=e109] [cursor=pointer]:
            - img [ref=e110]
          - generic [ref=e114] [cursor=pointer]:
            - generic [ref=e115]:
              - img "Aaya Sher (From &quot;The Paradise&quot;) (Telugu)" [ref=e116]
              - generic [ref=e118]: ▶
            - paragraph [ref=e120]: Aaya Sher (From "The Paradise") (Telugu)
          - button [ref=e121] [cursor=pointer]:
            - img [ref=e122]
      - generic [ref=e126]:
        - heading "Trending Songs" [level=2] [ref=e127]
        - generic [ref=e128]:
          - button [ref=e129] [cursor=pointer]:
            - img [ref=e130]
          - generic [ref=e133]:
            - generic [ref=e134] [cursor=pointer]:
              - generic [ref=e135]:
                - img "Aaya Sher (From &quot;The Paradise&quot;) (Telugu)" [ref=e136]
                - generic [ref=e138]: ▶
              - paragraph [ref=e140]: Aaya Sher (From "The Paradise") (Telugu)
            - generic [ref=e141] [cursor=pointer]:
              - generic [ref=e142]:
                - img "Chikiri Chikiri (From &quot;Peddi&quot;) - Telugu" [ref=e143]
                - generic [ref=e145]: ▶
              - paragraph [ref=e147]: Chikiri Chikiri (From "Peddi") - Telugu
            - generic [ref=e148] [cursor=pointer]:
              - generic [ref=e149]:
                - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e150]
                - generic [ref=e152]: ▶
              - paragraph [ref=e154]: Chikiri Chikiri (From "Peddi")
            - generic [ref=e155] [cursor=pointer]:
              - generic [ref=e156]:
                - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e157]
                - generic [ref=e159]: ▶
              - paragraph [ref=e161]: Chikiri Chikiri (From "Peddi")
            - generic [ref=e162] [cursor=pointer]:
              - generic [ref=e163]:
                - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e164]
                - generic [ref=e166]: ▶
              - paragraph [ref=e168]: Chikiri Chikiri (From "Peddi")
            - generic [ref=e169] [cursor=pointer]:
              - generic [ref=e170]:
                - img "Hellallallo (From &quot;Peddi&quot;) - Telugu" [ref=e171]
                - generic [ref=e173]: ▶
              - paragraph [ref=e175]: Hellallallo (From "Peddi") - Telugu
            - generic [ref=e176] [cursor=pointer]:
              - generic [ref=e177]:
                - img "Boom Boom (From &quot;Dude (Telugu)&quot;)" [ref=e178]
                - generic [ref=e180]: ▶
              - paragraph [ref=e182]: Boom Boom (From "Dude (Telugu)")
            - generic [ref=e183] [cursor=pointer]:
              - generic [ref=e184]:
                - img "Boom Boom" [ref=e185]
                - generic [ref=e187]: ▶
              - paragraph [ref=e189]: Boom Boom
            - generic [ref=e190] [cursor=pointer]:
              - generic [ref=e191]:
                - img "Rai Rai Raa Raa (From &quot;Peddi&quot;) - Telugu" [ref=e192]
                - generic [ref=e194]: ▶
              - paragraph [ref=e196]: Rai Rai Raa Raa (From "Peddi") - Telugu
            - generic [ref=e197] [cursor=pointer]:
              - generic [ref=e198]:
                - img "Singari (From &quot;Dude (Telugu)&quot;)" [ref=e199]
                - generic [ref=e201]: ▶
              - paragraph [ref=e203]: Singari (From "Dude (Telugu)")
            - generic [ref=e204] [cursor=pointer]:
              - generic [ref=e205]:
                - img "Singari" [ref=e206]
                - generic [ref=e208]: ▶
              - paragraph [ref=e210]: Singari
            - generic [ref=e211] [cursor=pointer]:
              - generic [ref=e212]:
                - img "Rai Rai Raa Raa (From &quot;Peddi&quot;)" [ref=e213]
                - generic [ref=e215]: ▶
              - paragraph [ref=e217]: Rai Rai Raa Raa (From "Peddi")
            - generic [ref=e218] [cursor=pointer]:
              - generic [ref=e219]:
                - img "Rubaroo (From &quot;Dacoit (Telugu)&quot;)" [ref=e220]
                - generic [ref=e222]: ▶
              - paragraph [ref=e224]: Rubaroo (From "Dacoit (Telugu)")
            - generic [ref=e225] [cursor=pointer]:
              - generic [ref=e226]:
                - img "Rubaroo" [ref=e227]
                - generic [ref=e229]: ▶
              - paragraph [ref=e231]: Rubaroo
            - generic [ref=e232] [cursor=pointer]:
              - generic [ref=e233]:
                - img "Peelings (From &quot;Pushpa 2 The Rule&quot;)" [ref=e234]
                - generic [ref=e236]: ▶
              - paragraph [ref=e238]: Peelings (From "Pushpa 2 The Rule")
            - generic [ref=e239] [cursor=pointer]:
              - generic [ref=e240]:
                - img "Sahana Sahana (From &quot;The Rajasaab&quot;) - Telugu" [ref=e241]
                - generic [ref=e243]: ▶
              - paragraph [ref=e245]: Sahana Sahana (From "The Rajasaab") - Telugu
            - generic [ref=e246] [cursor=pointer]:
              - generic [ref=e247]:
                - img "Peelings (Telugu)" [ref=e248]
                - generic [ref=e250]: ▶
              - paragraph [ref=e252]: Peelings (Telugu)
            - generic [ref=e253] [cursor=pointer]:
              - generic [ref=e254]:
                - img "Pillaa Raa" [ref=e255]
                - generic [ref=e257]: ▶
              - paragraph [ref=e259]: Pillaa Raa
            - generic [ref=e260] [cursor=pointer]:
              - generic [ref=e261]:
                - img "Sahana Sahana (From &quot;The Rajasaab&quot;)" [ref=e262]
                - generic [ref=e264]: ▶
              - paragraph [ref=e266]: Sahana Sahana (From "The Rajasaab")
            - generic [ref=e267] [cursor=pointer]:
              - generic [ref=e268]:
                - img "Sahana Sahana" [ref=e269]
                - generic [ref=e271]: ▶
              - paragraph [ref=e273]: Sahana Sahana
            - generic [ref=e274] [cursor=pointer]:
              - generic [ref=e275]:
                - img "Sarkaru Raa" [ref=e276]
                - generic [ref=e278]: ▶
              - paragraph [ref=e280]: Sarkaru Raa
            - generic [ref=e281] [cursor=pointer]:
              - generic [ref=e282]:
                - img "Gulabi Kallu Rendu Mullu" [ref=e283]
                - generic [ref=e285]: ▶
              - paragraph [ref=e287]: Gulabi Kallu Rendu Mullu
            - generic [ref=e288] [cursor=pointer]:
              - generic [ref=e289]:
                - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e290]
                - generic [ref=e292]: ▶
              - paragraph [ref=e294]: Chinni Gundelo (From "Andhra King Taluka")
            - generic [ref=e295] [cursor=pointer]:
              - generic [ref=e296]:
                - img "Nijame Ne Chebutunna" [ref=e297]
                - generic [ref=e299]: ▶
              - paragraph [ref=e301]: Nijame Ne Chebutunna
            - generic [ref=e302] [cursor=pointer]:
              - generic [ref=e303]:
                - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e304]
                - generic [ref=e306]: ▶
              - paragraph [ref=e308]: Chinni Gundelo (From "Andhra King Taluka")
          - button [ref=e309] [cursor=pointer]:
            - img [ref=e310]
      - generic [ref=e314]:
        - heading "Trending Albums" [level=2] [ref=e315]
        - generic [ref=e316]:
          - button [ref=e317] [cursor=pointer]:
            - img [ref=e318]
          - generic [ref=e321]:
            - generic [ref=e322] [cursor=pointer]:
              - generic [ref=e323]:
                - img "Govinda Namalu" [ref=e324]
                - generic [ref=e326]: ▶
              - paragraph [ref=e328]: Govinda Namalu
            - generic [ref=e329] [cursor=pointer]:
              - generic [ref=e330]:
                - img "Samayama (From \"Hi Nanna\")" [ref=e331]
                - generic [ref=e333]: ▶
              - paragraph [ref=e335]: Samayama (From "Hi Nanna")
            - generic [ref=e336] [cursor=pointer]:
              - generic [ref=e337]:
                - img "Ammayi (From \"ANIMAL\") [Telugu]" [ref=e338]
                - generic [ref=e340]: ▶
              - paragraph [ref=e342]: Ammayi (From "ANIMAL") [Telugu]
            - generic [ref=e343] [cursor=pointer]:
              - generic [ref=e344]:
                - img "Devara Part 1 - Telugu" [ref=e345]
                - generic [ref=e347]: ▶
              - paragraph [ref=e349]: Devara Part 1 - Telugu
            - generic [ref=e350] [cursor=pointer]:
              - generic [ref=e351]:
                - img "Pushpa 2 The Rule - (Telugu)" [ref=e352]
                - generic [ref=e354]: ▶
              - paragraph [ref=e356]: Pushpa 2 The Rule - (Telugu)
            - generic [ref=e357] [cursor=pointer]:
              - generic [ref=e358]:
                - img "Aaya Sher (From \"The Paradise\") (Telugu)" [ref=e359]
                - generic [ref=e361]: ▶
              - paragraph [ref=e363]: Aaya Sher (From "The Paradise") (Telugu)
            - generic [ref=e364] [cursor=pointer]:
              - generic [ref=e365]:
                - img "Geetha Govindam" [ref=e366]
                - generic [ref=e368]: ▶
              - paragraph [ref=e370]: Geetha Govindam
            - generic [ref=e371] [cursor=pointer]:
              - generic [ref=e372]:
                - img "Chikiri Chikiri (From \"Peddi\") - Telugu" [ref=e373]
                - generic [ref=e375]: ▶
              - paragraph [ref=e377]: Chikiri Chikiri (From "Peddi") - Telugu
            - generic [ref=e378] [cursor=pointer]:
              - generic [ref=e379]:
                - img "Iddarammayilatho" [ref=e380]
                - generic [ref=e382]: ▶
              - paragraph [ref=e384]: Iddarammayilatho
            - generic [ref=e385] [cursor=pointer]:
              - generic [ref=e386]:
                - img "Agnyaathavaasi" [ref=e387]
                - generic [ref=e389]: ▶
              - paragraph [ref=e391]: Agnyaathavaasi
            - generic [ref=e392] [cursor=pointer]:
              - generic [ref=e393]:
                - img "Orange" [ref=e394]
                - generic [ref=e396]: ▶
              - paragraph [ref=e398]: Orange
            - generic [ref=e399] [cursor=pointer]:
              - generic [ref=e400]:
                - img "Hellallallo (From \"Peddi\") - Telugu" [ref=e401]
                - generic [ref=e403]: ▶
              - paragraph [ref=e405]: Hellallallo (From "Peddi") - Telugu
            - generic [ref=e406] [cursor=pointer]:
              - generic [ref=e407]:
                - img "Mirchi" [ref=e408]
                - generic [ref=e410]: ▶
              - paragraph [ref=e412]: Mirchi
            - generic [ref=e413] [cursor=pointer]:
              - generic [ref=e414]:
                - img "Boom Boom (From \"Dude (Telugu)\")" [ref=e415]
                - generic [ref=e417]: ▶
              - paragraph [ref=e419]: Boom Boom (From "Dude (Telugu)")
            - generic [ref=e420] [cursor=pointer]:
              - generic [ref=e421]:
                - img "Ishq" [ref=e422]
                - generic [ref=e424]: ▶
              - paragraph [ref=e426]: Ishq
            - generic [ref=e427] [cursor=pointer]:
              - generic [ref=e428]:
                - img "Govindudu Andarivaadele" [ref=e429]
                - generic [ref=e431]: ▶
              - paragraph [ref=e433]: Govindudu Andarivaadele
            - generic [ref=e434] [cursor=pointer]:
              - generic [ref=e435]:
                - img "Chirutha" [ref=e436]
                - generic [ref=e438]: ▶
              - paragraph [ref=e440]: Chirutha
            - generic [ref=e441] [cursor=pointer]:
              - generic [ref=e442]:
                - img "Athadu" [ref=e443]
                - generic [ref=e445]: ▶
              - paragraph [ref=e447]: Athadu
            - generic [ref=e448] [cursor=pointer]:
              - generic [ref=e449]:
                - img "Nenu Local" [ref=e450]
                - generic [ref=e452]: ▶
              - paragraph [ref=e454]: Nenu Local
            - generic [ref=e455] [cursor=pointer]:
              - generic [ref=e456]:
                - img "Ala Vaikunthapurramuloo" [ref=e457]
                - generic [ref=e459]: ▶
              - paragraph [ref=e461]: Ala Vaikunthapurramuloo
            - generic [ref=e462] [cursor=pointer]:
              - generic [ref=e463]:
                - img "Pokiri" [ref=e464]
                - generic [ref=e466]: ▶
              - paragraph [ref=e468]: Pokiri
            - generic [ref=e469] [cursor=pointer]:
              - generic [ref=e470]:
                - img "Varsham" [ref=e471]
                - generic [ref=e473]: ▶
              - paragraph [ref=e475]: Varsham
            - generic [ref=e476] [cursor=pointer]:
              - generic [ref=e477]:
                - img "Rai Rai Raa Raa (From \"Peddi\") - Telugu" [ref=e478]
                - generic [ref=e480]: ▶
              - paragraph [ref=e482]: Rai Rai Raa Raa (From "Peddi") - Telugu
            - generic [ref=e483] [cursor=pointer]:
              - generic [ref=e484]:
                - img "Gabbar Singh" [ref=e485]
                - generic [ref=e487]: ▶
              - paragraph [ref=e489]: Gabbar Singh
            - generic [ref=e490] [cursor=pointer]:
              - generic [ref=e491]:
                - img "Munna" [ref=e492]
                - generic [ref=e494]: ▶
              - paragraph [ref=e496]: Munna
          - button [ref=e497] [cursor=pointer]:
            - img [ref=e498]
      - generic [ref=e502]:
        - heading "Featured Artists" [level=2] [ref=e503]
        - generic [ref=e504]:
          - button [ref=e505] [cursor=pointer]:
            - img [ref=e506]
          - generic [ref=e509]:
            - generic [ref=e510] [cursor=pointer]:
              - generic [ref=e511]:
                - img "Sid Sriram" [ref=e512]
                - generic [ref=e514]: ▶
              - paragraph [ref=e516]: Sid Sriram
            - generic [ref=e517] [cursor=pointer]:
              - generic [ref=e518]:
                - img "Thaman S" [ref=e519]
                - generic [ref=e521]: ▶
              - paragraph [ref=e523]: Thaman S
            - generic [ref=e524] [cursor=pointer]:
              - generic [ref=e525]:
                - img "Devi Sri Prasad" [ref=e526]
                - generic [ref=e528]: ▶
              - paragraph [ref=e530]: Devi Sri Prasad
            - generic [ref=e531] [cursor=pointer]:
              - generic [ref=e532]:
                - img "Mani Sharma" [ref=e533]
                - generic [ref=e535]: ▶
              - paragraph [ref=e537]: Mani Sharma
            - generic [ref=e538] [cursor=pointer]:
              - generic [ref=e539]:
                - img "S. P. Balasubrahmanyam" [ref=e540]
                - generic [ref=e542]: ▶
              - paragraph [ref=e544]: S. P. Balasubrahmanyam
          - button [ref=e545] [cursor=pointer]:
            - img [ref=e546]
      - generic [ref=e550]:
        - heading "Top Playlists" [level=2] [ref=e551]
        - generic [ref=e552]:
          - button [ref=e553] [cursor=pointer]:
            - img [ref=e554]
          - generic [ref=e557]:
            - generic [ref=e558] [cursor=pointer]:
              - generic [ref=e559]:
                - img "Telugu 2000s" [ref=e560]
                - generic [ref=e562]: ▶
              - paragraph [ref=e564]: Telugu 2000s
            - generic [ref=e565] [cursor=pointer]:
              - generic [ref=e566]:
                - img "Telugu 1990s" [ref=e567]
                - generic [ref=e569]: ▶
              - paragraph [ref=e571]: Telugu 1990s
            - generic [ref=e572] [cursor=pointer]:
              - generic [ref=e573]:
                - img "Telugu Folk Songs" [ref=e574]
                - generic [ref=e576]: ▶
              - paragraph [ref=e578]: Telugu Folk Songs
            - generic [ref=e579] [cursor=pointer]:
              - generic [ref=e580]:
                - img "Telugu Viral Hits" [ref=e581]
                - generic [ref=e583]: ▶
              - paragraph [ref=e585]: Telugu Viral Hits
            - generic [ref=e586] [cursor=pointer]:
              - generic [ref=e587]:
                - img "90s Romance - Telugu" [ref=e588]
                - generic [ref=e590]: ▶
              - paragraph [ref=e592]: 90s Romance - Telugu
            - generic [ref=e593] [cursor=pointer]:
              - generic [ref=e594]:
                - img "Telugu 1980s" [ref=e595]
                - generic [ref=e597]: ▶
              - paragraph [ref=e599]: Telugu 1980s
            - generic [ref=e600] [cursor=pointer]:
              - generic [ref=e601]:
                - img "Telugu 1970s" [ref=e602]
                - generic [ref=e604]: ▶
              - paragraph [ref=e606]: Telugu 1970s
            - generic [ref=e607] [cursor=pointer]:
              - generic [ref=e608]:
                - img "2000s Romance - Telugu" [ref=e609]
                - generic [ref=e611]: ▶
              - paragraph [ref=e613]: 2000s Romance - Telugu
            - generic [ref=e614] [cursor=pointer]:
              - generic [ref=e615]:
                - img "Shiva - Telugu" [ref=e616]
                - generic [ref=e618]: ▶
              - paragraph [ref=e620]: Shiva - Telugu
            - generic [ref=e621] [cursor=pointer]:
              - generic [ref=e622]:
                - 'img "Telugu: India Superhits Top 50" [ref=e623]'
                - generic [ref=e625]: ▶
              - paragraph [ref=e627]: "Telugu: India Superhits Top 50"
            - generic [ref=e628] [cursor=pointer]:
              - generic [ref=e629]:
                - img "Telugu 1960s" [ref=e630]
                - generic [ref=e632]: ▶
              - paragraph [ref=e634]: Telugu 1960s
            - generic [ref=e635] [cursor=pointer]:
              - generic [ref=e636]:
                - img "Most Searched Songs - Telugu" [ref=e637]
                - generic [ref=e639]: ▶
              - paragraph [ref=e641]: Most Searched Songs - Telugu
            - generic [ref=e642] [cursor=pointer]:
              - generic [ref=e643]:
                - img "Romantic Monsoon - Telugu" [ref=e644]
                - generic [ref=e646]: ▶
              - paragraph [ref=e648]: Romantic Monsoon - Telugu
            - generic [ref=e649] [cursor=pointer]:
              - generic [ref=e650]:
                - img "Best Of 2000s - Telugu" [ref=e651]
                - generic [ref=e653]: ▶
              - paragraph [ref=e655]: Best Of 2000s - Telugu
            - generic [ref=e656] [cursor=pointer]:
              - generic [ref=e657]:
                - img "Ayyappa Swamy - Telugu" [ref=e658]
                - generic [ref=e660]: ▶
              - paragraph [ref=e662]: Ayyappa Swamy - Telugu
            - generic [ref=e663] [cursor=pointer]:
              - generic [ref=e664]:
                - img "Hanuman - Telugu" [ref=e665]
                - generic [ref=e667]: ▶
              - paragraph [ref=e669]: Hanuman - Telugu
            - generic [ref=e670] [cursor=pointer]:
              - generic [ref=e671]:
                - img "80s Romance - Telugu" [ref=e672]
                - generic [ref=e674]: ▶
              - paragraph [ref=e676]: 80s Romance - Telugu
            - generic [ref=e677] [cursor=pointer]:
              - generic [ref=e678]:
                - img "Trending Telugu Songs" [ref=e679]
                - generic [ref=e681]: ▶
              - paragraph [ref=e683]: Trending Telugu Songs
            - generic [ref=e684] [cursor=pointer]:
              - generic [ref=e685]:
                - img "Venkateswara Swamy - Telugu" [ref=e686]
                - generic [ref=e688]: ▶
              - paragraph [ref=e690]: Venkateswara Swamy - Telugu
            - generic [ref=e691] [cursor=pointer]:
              - generic [ref=e692]:
                - img "Ganapathi - Telugu" [ref=e693]
                - generic [ref=e695]: ▶
              - paragraph [ref=e697]: Ganapathi - Telugu
            - generic [ref=e698] [cursor=pointer]:
              - generic [ref=e699]:
                - img "Balakrishna - 90s Hits - Telugu" [ref=e700]
                - generic [ref=e702]: ▶
              - paragraph [ref=e704]: Balakrishna - 90s Hits - Telugu
            - generic [ref=e705] [cursor=pointer]:
              - generic [ref=e706]:
                - img "Krishna - Telugu" [ref=e707]
                - generic [ref=e709]: ▶
              - paragraph [ref=e711]: Krishna - Telugu
            - generic [ref=e712] [cursor=pointer]:
              - generic [ref=e713]:
                - img "Retro Romance - Telugu" [ref=e714]
                - generic [ref=e716]: ▶
              - paragraph [ref=e718]: Retro Romance - Telugu
            - generic [ref=e719] [cursor=pointer]:
              - generic [ref=e720]:
                - img "Sid Sriram - Love Songs - Telugu" [ref=e721]
                - generic [ref=e723]: ▶
              - paragraph [ref=e725]: Sid Sriram - Love Songs - Telugu
            - generic [ref=e726] [cursor=pointer]:
              - generic [ref=e727]:
                - img "Best Of Romance - Telugu" [ref=e728]
                - generic [ref=e730]: ▶
              - paragraph [ref=e732]: Best Of Romance - Telugu
          - button [ref=e733] [cursor=pointer]:
            - img [ref=e734]
      - generic [ref=e738]:
        - heading "Meditation" [level=2] [ref=e739]
        - generic [ref=e740]:
          - button [ref=e741] [cursor=pointer]:
            - img [ref=e742]
          - generic [ref=e746] [cursor=pointer]:
            - generic [ref=e747]:
              - img "Meditation Vibes - Telugu" [ref=e748]
              - generic [ref=e750]: ▶
            - paragraph [ref=e752]: Meditation Vibes - Telugu
          - button [ref=e753] [cursor=pointer]:
            - img [ref=e754]
      - generic [ref=e758]:
        - heading "Work" [level=2] [ref=e759]
        - generic [ref=e760]:
          - button [ref=e761] [cursor=pointer]:
            - img [ref=e762]
          - generic [ref=e765]:
            - generic [ref=e766] [cursor=pointer]:
              - generic [ref=e767]:
                - img "Chill At Work - Telugu" [ref=e768]
                - generic [ref=e770]: ▶
              - paragraph [ref=e772]: Chill At Work - Telugu
            - generic [ref=e773] [cursor=pointer]:
              - generic [ref=e774]:
                - img "Workout From Home - Telugu" [ref=e775]
                - generic [ref=e777]: ▶
              - paragraph [ref=e779]: Workout From Home - Telugu
          - button [ref=e780] [cursor=pointer]:
            - img [ref=e781]
      - generic [ref=e785]:
        - heading "Developer's Picks" [level=2] [ref=e786]
        - generic [ref=e787]:
          - button [ref=e788] [cursor=pointer]:
            - img [ref=e789]
          - generic [ref=e792]:
            - generic [ref=e793] [cursor=pointer]:
              - generic [ref=e794]:
                - img "The House Of House" [ref=e795]
                - generic [ref=e797]: ▶
              - paragraph [ref=e799]: The House Of House
            - generic [ref=e800] [cursor=pointer]:
              - generic [ref=e801]:
                - img "Becoming Insane (Album Mix)" [ref=e802]
                - generic [ref=e804]: ▶
              - paragraph [ref=e806]: Becoming Insane (Album Mix)
            - generic [ref=e807] [cursor=pointer]:
              - generic [ref=e808]:
                - img "Lovingly" [ref=e809]
                - generic [ref=e811]: ▶
              - paragraph [ref=e813]: Lovingly
            - generic [ref=e814] [cursor=pointer]:
              - generic [ref=e815]:
                - img "Nightwalk" [ref=e816]
                - generic [ref=e818]: ▶
              - paragraph [ref=e820]: Nightwalk
            - generic [ref=e821] [cursor=pointer]:
              - generic [ref=e822]:
                - img "The Great Spirit (Hallucinogen Remix)" [ref=e823]
                - generic [ref=e825]: ▶
              - paragraph [ref=e827]: The Great Spirit (Hallucinogen Remix)
            - generic [ref=e828] [cursor=pointer]:
              - generic [ref=e829]:
                - img "Beyond the Senses" [ref=e830]
                - generic [ref=e832]: ▶
              - paragraph [ref=e834]: Beyond the Senses
            - generic [ref=e835] [cursor=pointer]:
              - generic [ref=e836]:
                - img "Communication" [ref=e837]
                - generic [ref=e839]: ▶
              - paragraph [ref=e841]: Communication
            - generic [ref=e842] [cursor=pointer]:
              - generic [ref=e843]:
                - img "Maximum Overdrive" [ref=e844]
                - generic [ref=e846]: ▶
              - paragraph [ref=e848]: Maximum Overdrive
            - generic [ref=e849] [cursor=pointer]:
              - generic [ref=e850]:
                - img "I Believe" [ref=e851]
                - generic [ref=e853]: ▶
              - paragraph [ref=e855]: I Believe
            - generic [ref=e856] [cursor=pointer]:
              - generic [ref=e857]:
                - img "Nomad (Extended Mix)" [ref=e858]
                - generic [ref=e860]: ▶
              - paragraph [ref=e862]: Nomad (Extended Mix)
            - generic [ref=e863] [cursor=pointer]:
              - generic [ref=e864]:
                - img "Adapt Or Die" [ref=e865]
                - generic [ref=e867]: ▶
              - paragraph [ref=e869]: Adapt Or Die
            - generic [ref=e870] [cursor=pointer]:
              - generic [ref=e871]:
                - img "For Those We Lost" [ref=e872]
                - generic [ref=e874]: ▶
              - paragraph [ref=e876]: For Those We Lost
            - generic [ref=e877] [cursor=pointer]:
              - generic [ref=e878]:
                - img "Red Rocks" [ref=e879]
                - generic [ref=e881]: ▶
              - paragraph [ref=e883]: Red Rocks
            - generic [ref=e884] [cursor=pointer]:
              - generic [ref=e885]:
                - img "Sonar" [ref=e886]
                - generic [ref=e888]: ▶
              - paragraph [ref=e890]: Sonar
            - generic [ref=e891] [cursor=pointer]:
              - generic [ref=e892]:
                - img "As The Rush Comes (Radio Edit)" [ref=e893]
                - generic [ref=e895]: ▶
              - paragraph [ref=e897]: As The Rush Comes (Radio Edit)
            - generic [ref=e898] [cursor=pointer]:
              - generic [ref=e899]:
                - img "Let Me Know" [ref=e900]
                - generic [ref=e902]: ▶
              - paragraph [ref=e904]: Let Me Know
            - generic [ref=e905] [cursor=pointer]:
              - generic [ref=e906]:
                - img "Carte Blanche (Cosmic Gate Remix)" [ref=e907]
                - generic [ref=e909]: ▶
              - paragraph [ref=e911]: Carte Blanche (Cosmic Gate Remix)
            - generic [ref=e912] [cursor=pointer]:
              - generic [ref=e913]:
                - img "Universal Nation" [ref=e914]
                - generic [ref=e916]: ▶
              - paragraph [ref=e918]: Universal Nation
            - generic [ref=e919] [cursor=pointer]:
              - generic [ref=e920]:
                - img "Clear Blue Moon (Original Mix)" [ref=e921]
                - generic [ref=e923]: ▶
              - paragraph [ref=e925]: Clear Blue Moon (Original Mix)
            - generic [ref=e926] [cursor=pointer]:
              - generic [ref=e927]:
                - img "Hyperspace" [ref=e928]
                - generic [ref=e930]: ▶
              - paragraph [ref=e932]: Hyperspace
          - button [ref=e933] [cursor=pointer]:
            - img [ref=e934]
      - generic [ref=e938]:
        - heading "Chill" [level=2] [ref=e939]
        - generic [ref=e940]:
          - button [ref=e941] [cursor=pointer]:
            - img [ref=e942]
          - generic [ref=e945]:
            - generic [ref=e946] [cursor=pointer]:
              - generic [ref=e947]:
                - img "Chill Boss" [ref=e948]
                - generic [ref=e950]: ▶
              - paragraph [ref=e952]: Chill Boss
            - generic [ref=e953] [cursor=pointer]:
              - generic [ref=e954]:
                - img "Chill At Work - Telugu" [ref=e955]
                - generic [ref=e957]: ▶
              - paragraph [ref=e959]: Chill At Work - Telugu
            - generic [ref=e960] [cursor=pointer]:
              - generic [ref=e961]:
                - img "Chai And Chill - Telugu" [ref=e962]
                - generic [ref=e964]: ▶
              - paragraph [ref=e966]: Chai And Chill - Telugu
            - generic [ref=e967] [cursor=pointer]:
              - generic [ref=e968]:
                - img "Wow Winters - Hot Coffee Chills - Telugu" [ref=e969]
                - generic [ref=e971]: ▶
              - paragraph [ref=e973]: Wow Winters - Hot Coffee Chills - Telugu
          - button [ref=e974] [cursor=pointer]:
            - img [ref=e975]
      - generic [ref=e979]:
        - heading "Workout" [level=2] [ref=e980]
        - generic [ref=e981]:
          - button [ref=e982] [cursor=pointer]:
            - img [ref=e983]
          - generic [ref=e987] [cursor=pointer]:
            - generic [ref=e988]:
              - img "Workout From Home - Telugu" [ref=e989]
              - generic [ref=e991]: ▶
            - paragraph [ref=e993]: Workout From Home - Telugu
          - button [ref=e994] [cursor=pointer]:
            - img [ref=e995]
  - generic [ref=e998]:
    - slider [ref=e999] [cursor=pointer]: "1"
    - generic [ref=e1000] [cursor=pointer]:
      - generic [ref=e1002]:
        - generic:
          - generic: Swipe
      - generic [ref=e1003]:
        - button [ref=e1004]:
          - img [ref=e1005]
        - button [active] [ref=e1007]:
          - img [ref=e1008]
        - button [ref=e1010]:
          - img [ref=e1011]
      - generic [ref=e1013]:
        - button [ref=e1014]:
          - img [ref=e1015]
        - button [ref=e1018]:
          - img [ref=e1019]
        - generic:
          - generic:
            - generic:
              - slider: "0.7"
              - generic: 70%
```

# Test source

```ts
  1  |
  2  | import { test, expect } from '@playwright/test';
  3  |
  4  | test('verify expanded player and swipe', async ({ page }) => {
  5  |   test.setTimeout(90000);
  6  |   await page.setViewportSize({ width: 375, height: 812 });
  7  |
  8  |   console.log('Navigating to http://localhost:5173/');
  9  |   await page.goto('http://localhost:5173/');
  10 |   await page.waitForLoadState('networkidle');
  11 |
  12 |   // Click on the first "Trending Song"
  13 |   console.log('Clicking on a song...');
  14 |   const firstSong = page.locator('text=Aaya Sher').first();
  15 |   await firstSong.waitFor({ state: 'visible' });
  16 |   await firstSong.click();
  17 |
  18 |   await page.waitForTimeout(3000);
  19 |
  20 |   // Wait for the mini player to appear
  21 |   console.log('Waiting for mini player...');
  22 |   const miniPlayer = page.locator('div.fixed.bottom-0').first();
  23 |   await miniPlayer.waitFor({ state: 'visible' });
  24 |
  25 |   // Click to expand - specific click area to avoid buttons
  26 |   console.log('Expanding player...');
  27 |   await page.mouse.click(375 / 2, 812 - 50);
  28 |
  29 |   await page.waitForTimeout(2000);
  30 |
  31 |   // Wait for the expanded player
  32 |   console.log('Waiting for expanded player...');
  33 |   const expandedPlayer = page.locator('div.z-\\[220\\]').first();
> 34 |   await expandedPlayer.waitFor({ state: 'visible', timeout: 15000 });
     |                        ^ TimeoutError: locator.waitFor: Timeout 15000ms exceeded.
  35 |
  36 |   await page.screenshot({ path: 'verification/expanded_player_final.png' });
  37 |
  38 |   // Swipe album art
  39 |   console.log('Finding album art for swipe...');
  40 |   const albumArt = page.locator('img[layoutId="player-album-art"]').first();
  41 |   if (await albumArt.count() === 0) {
  42 |       console.log('Album art with layoutId not found, fallback to alt...');
  43 |   }
  44 |
  45 |   const target = albumArt.isVisible() ? albumArt : page.locator('img[alt="Album Art"]').first();
  46 |
  47 |   const box = await target.boundingBox();
  48 |   if (box) {
  49 |     console.log('Swiping album art left...');
  50 |     await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  51 |     await page.mouse.down();
  52 |     await page.mouse.move(box.x - 200, box.y + box.height / 2, { steps: 30 });
  53 |     await page.waitForTimeout(500);
  54 |     await page.screenshot({ path: 'verification/swiping_left_final.png' });
  55 |     await page.mouse.up();
  56 |     await page.waitForTimeout(2000);
  57 |     await page.screenshot({ path: 'verification/after_swipe_final.png' });
  58 |   }
  59 |
  60 |   // Check visualizer selector
  61 |   console.log('Checking visualizer selector...');
  62 |   const selectorButton = page.locator('button[title="bars visualizer"]').first();
  63 |   if (await selectorButton.count() > 0) {
  64 |       await selectorButton.click({ force: true });
  65 |       await page.waitForTimeout(1000);
  66 |       await page.screenshot({ path: 'verification/visualizer_selector_open_final.png' });
  67 |   }
  68 | });
  69 |
```