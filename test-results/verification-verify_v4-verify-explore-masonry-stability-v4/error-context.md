# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: verification/verify_v4.spec.ts >> verify explore masonry stability v4
- Location: verification/verify_v4.spec.ts:8:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('img[src*="i.scdn.co"]')

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - navigation [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6] [cursor=pointer]:
        - generic [ref=e7]: VibeOn
        - generic [ref=e8]: by WENODH
      - generic [ref=e9]:
        - button "Explore" [ref=e10] [cursor=pointer]:
          - img [ref=e11]
        - button "Settings" [ref=e14] [cursor=pointer]:
          - img "Logo" [ref=e15]
    - generic [ref=e17]:
      - textbox "Search for songs, albums, artists..." [ref=e18]
      - img [ref=e19]
  - main [ref=e22]:
    - generic [ref=e24]:
      - generic [ref=e25]:
        - generic [ref=e26]:
          - img [ref=e28]
          - heading "Explore" [level=1] [ref=e31]
        - paragraph [ref=e32]: Discover new music in telugu curated just for you.
      - generic [ref=e33]:
        - generic [ref=e34]:
          - generic [ref=e36] [cursor=pointer]:
            - img "Hellallallo (From &quot;Peddi&quot;) - Telugu" [ref=e37]
            - img [ref=e41]
            - generic [ref=e43]:
              - heading "Hellallallo (From \"Peddi\") - Telugu" [level=3] [ref=e44]
              - paragraph
          - generic [ref=e46] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;) - Telugu" [ref=e47]
            - img [ref=e51]
            - generic [ref=e53]:
              - heading "Chikiri Chikiri (From \"Peddi\") - Telugu" [level=3] [ref=e54]
              - paragraph
          - generic [ref=e56] [cursor=pointer]:
            - img "Chikiri Chikiri" [ref=e57]
            - img [ref=e61]
            - generic [ref=e63]:
              - heading "Chikiri Chikiri" [level=3] [ref=e64]
              - paragraph
          - generic [ref=e66] [cursor=pointer]:
            - img "Rai Rai Raa Raa (From &quot;Peddi&quot;) - Telugu" [ref=e67]
            - img [ref=e71]
            - generic [ref=e73]:
              - heading "Rai Rai Raa Raa (From \"Peddi\") - Telugu" [level=3] [ref=e74]
              - paragraph
          - generic [ref=e76] [cursor=pointer]:
            - img "Boom Boom (From &quot;Dude (Telugu)&quot;)" [ref=e77]
            - img [ref=e81]
            - generic [ref=e83]:
              - heading "Boom Boom (From \"Dude (Telugu)\")" [level=3] [ref=e84]
              - paragraph
          - generic [ref=e86] [cursor=pointer]:
            - img "Singari" [ref=e87]
            - img [ref=e91]
            - generic [ref=e93]:
              - heading "Singari" [level=3] [ref=e94]
              - paragraph
          - generic [ref=e96] [cursor=pointer]:
            - img "Peelings (Telugu)" [ref=e97]
            - img [ref=e101]
            - generic [ref=e103]:
              - heading "Peelings (Telugu)" [level=3] [ref=e104]
              - paragraph
          - generic [ref=e106] [cursor=pointer]:
            - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e107]
            - img [ref=e111]
            - generic [ref=e113]:
              - heading "Chinni Gundelo (From \"Andhra King Taluka\")" [level=3] [ref=e114]
              - paragraph
          - generic [ref=e116] [cursor=pointer]:
            - img "Niluvaddham" [ref=e117]
            - img [ref=e121]
            - generic [ref=e123]:
              - heading "Niluvaddham" [level=3] [ref=e124]
              - paragraph
          - generic [ref=e126] [cursor=pointer]:
            - img "Chamka Chamka" [ref=e127]
            - img [ref=e131]
            - generic [ref=e133]:
              - heading "Chamka Chamka" [level=3] [ref=e134]
              - paragraph
          - generic [ref=e136] [cursor=pointer]:
            - img "Hellallallo (From &quot;Peddi&quot;) - Telugu" [ref=e137]
            - img [ref=e141]
            - generic [ref=e143]:
              - heading "Hellallallo (From \"Peddi\") - Telugu" [level=3] [ref=e144]
              - paragraph
          - generic [ref=e146] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;) - Telugu" [ref=e147]
            - img [ref=e151]
            - generic [ref=e153]:
              - heading "Chikiri Chikiri (From \"Peddi\") - Telugu" [level=3] [ref=e154]
              - paragraph
          - generic [ref=e156] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e157]
            - img [ref=e161]
            - generic [ref=e163]:
              - heading "Chikiri Chikiri (From \"Peddi\")" [level=3] [ref=e164]
              - paragraph
          - generic [ref=e166] [cursor=pointer]:
            - img "Rai Rai Raa Raa (From &quot;Peddi&quot;) - Telugu" [ref=e167]
            - img [ref=e171]
            - generic [ref=e173]:
              - heading "Rai Rai Raa Raa (From \"Peddi\") - Telugu" [level=3] [ref=e174]
              - paragraph
          - generic [ref=e176] [cursor=pointer]:
            - img "Boom Boom (From &quot;Dude (Telugu)&quot;)" [ref=e177]
            - img [ref=e181]
            - generic [ref=e183]:
              - heading "Boom Boom (From \"Dude (Telugu)\")" [level=3] [ref=e184]
              - paragraph
          - generic [ref=e186] [cursor=pointer]:
            - img "Singari" [ref=e187]
            - img [ref=e191]
            - generic [ref=e193]:
              - heading "Singari" [level=3] [ref=e194]
              - paragraph
          - generic [ref=e196] [cursor=pointer]:
            - img "Peelings (Telugu)" [ref=e197]
            - img [ref=e201]
            - generic [ref=e203]:
              - heading "Peelings (Telugu)" [level=3] [ref=e204]
              - paragraph
          - generic [ref=e206] [cursor=pointer]:
            - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e207]
            - img [ref=e211]
            - generic [ref=e213]:
              - heading "Chinni Gundelo (From \"Andhra King Taluka\")" [level=3] [ref=e214]
              - paragraph
          - generic [ref=e216] [cursor=pointer]:
            - img "Niluvaddham" [ref=e217]
            - img [ref=e221]
            - generic [ref=e223]:
              - heading "Niluvaddham" [level=3] [ref=e224]
              - paragraph
          - generic [ref=e226] [cursor=pointer]:
            - img "Chamka Chamka" [ref=e227]
            - img [ref=e231]
            - generic [ref=e233]:
              - heading "Chamka Chamka" [level=3] [ref=e234]
              - paragraph
        - generic [ref=e235]:
          - generic [ref=e237] [cursor=pointer]:
            - img "Hellallallo" [ref=e238]
            - img [ref=e242]
            - generic [ref=e244]:
              - heading "Hellallallo" [level=3] [ref=e245]
              - paragraph
          - generic [ref=e247] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e248]
            - img [ref=e252]
            - generic [ref=e254]:
              - heading "Chikiri Chikiri (From \"Peddi\")" [level=3] [ref=e255]
              - paragraph
          - generic [ref=e257] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e258]
            - img [ref=e262]
            - generic [ref=e264]:
              - heading "Chikiri Chikiri (From \"Peddi\")" [level=3] [ref=e265]
              - paragraph
          - generic [ref=e267] [cursor=pointer]:
            - img "Rai Rai Raa Raa (From &quot;Peddi&quot;)" [ref=e268]
            - img [ref=e272]
            - generic [ref=e274]:
              - heading "Rai Rai Raa Raa (From \"Peddi\")" [level=3] [ref=e275]
              - paragraph
          - generic [ref=e277] [cursor=pointer]:
            - img "Boom Boom" [ref=e278]
            - img [ref=e282]
            - generic [ref=e284]:
              - heading "Boom Boom" [level=3] [ref=e285]
              - paragraph
          - generic [ref=e287] [cursor=pointer]:
            - img "Rubaroo (From &quot;Dacoit (Telugu)&quot;)" [ref=e288]
            - img [ref=e292]
            - generic [ref=e294]:
              - heading "Rubaroo (From \"Dacoit (Telugu)\")" [level=3] [ref=e295]
              - paragraph
          - generic [ref=e297] [cursor=pointer]:
            - img "Peelings (From &quot;Pushpa 2 The Rule&quot;)" [ref=e298]
            - img [ref=e302]
            - generic [ref=e304]:
              - heading "Peelings (From \"Pushpa 2 The Rule\")" [level=3] [ref=e305]
              - paragraph
          - generic [ref=e307] [cursor=pointer]:
            - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e308]
            - img [ref=e312]
            - generic [ref=e314]:
              - heading "Chinni Gundelo (From \"Andhra King Taluka\")" [level=3] [ref=e315]
              - paragraph
          - generic [ref=e317] [cursor=pointer]:
            - img "Yedhee (From &quot;Jaabilamma Neeku Antha Kopama&quot;)" [ref=e318]
            - img [ref=e322]
            - generic [ref=e324]:
              - heading "Yedhee (From \"Jaabilamma Neeku Antha Kopama\")" [level=3] [ref=e325]
              - paragraph
          - generic [ref=e327] [cursor=pointer]:
            - img "Sarkaru Raa" [ref=e328]
            - img [ref=e332]
            - generic [ref=e334]:
              - heading "Sarkaru Raa" [level=3] [ref=e335]
              - paragraph
          - generic [ref=e337] [cursor=pointer]:
            - img "Hellallallo" [ref=e338]
            - img [ref=e342]
            - generic [ref=e344]:
              - heading "Hellallallo" [level=3] [ref=e345]
              - paragraph
          - generic [ref=e347] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e348]
            - img [ref=e352]
            - generic [ref=e354]:
              - heading "Chikiri Chikiri (From \"Peddi\")" [level=3] [ref=e355]
              - paragraph
          - generic [ref=e357] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e358]
            - img [ref=e362]
            - generic [ref=e364]:
              - heading "Chikiri Chikiri (From \"Peddi\")" [level=3] [ref=e365]
              - paragraph
          - generic [ref=e367] [cursor=pointer]:
            - img "Rai Rai Raa Raa" [ref=e368]
            - img [ref=e372]
            - generic [ref=e374]:
              - heading "Rai Rai Raa Raa" [level=3] [ref=e375]
              - paragraph
          - generic [ref=e377] [cursor=pointer]:
            - img "Boom Boom" [ref=e378]
            - img [ref=e382]
            - generic [ref=e384]:
              - heading "Boom Boom" [level=3] [ref=e385]
              - paragraph
          - generic [ref=e387] [cursor=pointer]:
            - img "Rubaroo (From &quot;Dacoit (Telugu)&quot;)" [ref=e388]
            - img [ref=e392]
            - generic [ref=e394]:
              - heading "Rubaroo (From \"Dacoit (Telugu)\")" [level=3] [ref=e395]
              - paragraph
          - generic [ref=e397] [cursor=pointer]:
            - img "Peelings (From &quot;Pushpa 2 The Rule&quot;)" [ref=e398]
            - img [ref=e402]
            - generic [ref=e404]:
              - heading "Peelings (From \"Pushpa 2 The Rule\")" [level=3] [ref=e405]
              - paragraph
          - generic [ref=e407] [cursor=pointer]:
            - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e408]
            - img [ref=e412]
            - generic [ref=e414]:
              - heading "Chinni Gundelo (From \"Andhra King Taluka\")" [level=3] [ref=e415]
              - paragraph
          - generic [ref=e417] [cursor=pointer]:
            - img "Yedhee (From &quot;Jaabilamma Neeku Antha Kopama&quot;)" [ref=e418]
            - img [ref=e422]
            - generic [ref=e424]:
              - heading "Yedhee (From \"Jaabilamma Neeku Antha Kopama\")" [level=3] [ref=e425]
              - paragraph
          - generic [ref=e427] [cursor=pointer]:
            - img "Sarkaru Raa" [ref=e428]
            - img [ref=e432]
            - generic [ref=e434]:
              - heading "Sarkaru Raa" [level=3] [ref=e435]
              - paragraph
        - generic [ref=e436]:
          - generic [ref=e438] [cursor=pointer]:
            - img "Massa Massa" [ref=e439]
            - img [ref=e443]
            - generic [ref=e445]:
              - heading "Massa Massa" [level=3] [ref=e446]
              - paragraph
          - generic [ref=e448] [cursor=pointer]:
            - img "Chikiri Chikiri (From &quot;Peddi&quot;)" [ref=e449]
            - img [ref=e453]
            - generic [ref=e455]:
              - heading "Chikiri Chikiri (From \"Peddi\")" [level=3] [ref=e456]
              - paragraph
          - generic [ref=e458] [cursor=pointer]:
            - img "Aaya Sher (From &quot;The Paradise&quot;) (Telugu)" [ref=e459]
            - img [ref=e463]
            - generic [ref=e465]:
              - heading "Aaya Sher (From \"The Paradise\") (Telugu)" [level=3] [ref=e466]
              - paragraph
          - generic [ref=e468] [cursor=pointer]:
            - img "Rai Rai Raa Raa" [ref=e469]
            - img [ref=e473]
            - generic [ref=e475]:
              - heading "Rai Rai Raa Raa" [level=3] [ref=e476]
              - paragraph
          - generic [ref=e478] [cursor=pointer]:
            - img "Singari (From &quot;Dude (Telugu)&quot;)" [ref=e479]
            - img [ref=e483]
            - generic [ref=e485]:
              - heading "Singari (From \"Dude (Telugu)\")" [level=3] [ref=e486]
              - paragraph
          - generic [ref=e488] [cursor=pointer]:
            - img "Rubaroo" [ref=e489]
            - img [ref=e493]
            - generic [ref=e495]:
              - heading "Rubaroo" [level=3] [ref=e496]
              - paragraph
          - generic [ref=e498] [cursor=pointer]:
            - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e499]
            - img [ref=e503]
            - generic [ref=e505]:
              - heading "Chinni Gundelo (From \"Andhra King Taluka\")" [level=3] [ref=e506]
              - paragraph
          - generic [ref=e508] [cursor=pointer]:
            - img "Chinni Gundelo" [ref=e509]
            - img [ref=e513]
            - generic [ref=e515]:
              - heading "Chinni Gundelo" [level=3] [ref=e516]
              - paragraph
          - generic [ref=e518] [cursor=pointer]:
            - img "Mellaga" [ref=e519]
            - img [ref=e523]
            - generic [ref=e525]:
              - heading "Mellaga" [level=3] [ref=e526]
              - paragraph
          - generic [ref=e528] [cursor=pointer]:
            - img "Chamiki (From &quot;Youth - Telugu&quot;)" [ref=e529]
            - img [ref=e533]
            - generic [ref=e535]:
              - heading "Chamiki (From \"Youth - Telugu\")" [level=3] [ref=e536]
              - paragraph
          - generic [ref=e538] [cursor=pointer]:
            - img "Massa Massa" [ref=e539]
            - img [ref=e543]
            - generic [ref=e545]:
              - heading "Massa Massa" [level=3] [ref=e546]
              - paragraph
          - generic [ref=e548] [cursor=pointer]:
            - img "Chikiri Chikiri" [ref=e549]
            - img [ref=e553]
            - generic [ref=e555]:
              - heading "Chikiri Chikiri" [level=3] [ref=e556]
              - paragraph
          - generic [ref=e558] [cursor=pointer]:
            - img "Aaya Sher (From &quot;The Paradise&quot;) (Telugu)" [ref=e559]
            - img [ref=e563]
            - generic [ref=e565]:
              - heading "Aaya Sher (From \"The Paradise\") (Telugu)" [level=3] [ref=e566]
              - paragraph
          - generic [ref=e568] [cursor=pointer]:
            - img "Rai Rai Raa Raa (From &quot;Peddi&quot;)" [ref=e569]
            - img [ref=e573]
            - generic [ref=e575]:
              - heading "Rai Rai Raa Raa (From \"Peddi\")" [level=3] [ref=e576]
              - paragraph
          - generic [ref=e578] [cursor=pointer]:
            - img "Singari (From &quot;Dude (Telugu)&quot;)" [ref=e579]
            - img [ref=e583]
            - generic [ref=e585]:
              - heading "Singari (From \"Dude (Telugu)\")" [level=3] [ref=e586]
              - paragraph
          - generic [ref=e588] [cursor=pointer]:
            - img "Rubaroo" [ref=e589]
            - img [ref=e593]
            - generic [ref=e595]:
              - heading "Rubaroo" [level=3] [ref=e596]
              - paragraph
          - generic [ref=e598] [cursor=pointer]:
            - img "Chinni Gundelo (From &quot;Andhra King Taluka&quot;)" [ref=e599]
            - img [ref=e603]
            - generic [ref=e605]:
              - heading "Chinni Gundelo (From \"Andhra King Taluka\")" [level=3] [ref=e606]
              - paragraph
          - generic [ref=e608] [cursor=pointer]:
            - img "Chinni Gundelo" [ref=e609]
            - img [ref=e613]
            - generic [ref=e615]:
              - heading "Chinni Gundelo" [level=3] [ref=e616]
              - paragraph
          - generic [ref=e618] [cursor=pointer]:
            - img "Mellaga" [ref=e619]
            - img [ref=e623]
            - generic [ref=e625]:
              - heading "Mellaga" [level=3] [ref=e626]
              - paragraph
          - generic [ref=e628] [cursor=pointer]:
            - img "Chamiki (From &quot;Youth - Telugu&quot;)" [ref=e629]
            - img [ref=e633]
            - generic [ref=e635]:
              - heading "Chamiki (From \"Youth - Telugu\")" [level=3] [ref=e636]
              - paragraph
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  |
  3  | test.use({
  4  |   viewport: { width: 390, height: 844 },
  5  |   deviceScaleFactor: 2,
  6  | });
  7  |
  8  | test('verify explore masonry stability v4', async ({ page }) => {
  9  |   await page.goto('http://localhost:5173/explore');
  10 |
  11 |   // Wait for initial load
  12 |   await page.waitForSelector('.animate-pulse', { state: 'detached', timeout: 15000 });
  13 |   await page.waitForTimeout(2000);
  14 |
  15 |   // Mobile check (minimum 3 columns)
  16 |   const columns = await page.locator('.flex.gap-2.sm\\:gap-3.lg\\:gap-4.items-start > div');
  17 |   const count = await columns.count();
  18 |   console.log(`Column count on mobile: ${count}`);
  19 |   expect(count).toBe(3);
  20 |
  21 |   await page.screenshot({ path: 'verification/explore_mobile_v4.png', fullPage: true });
  22 |
  23 |   // Scroll to bottom to trigger load
  24 |   await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  25 |   await page.waitForTimeout(3000); // Wait for fetch
  26 |
  27 |   await page.screenshot({ path: 'verification/explore_mobile_v4_scrolled.png', fullPage: true });
  28 |
  29 |   // Verify Player stopPropagation (Manual check usually, but let's check player expansion)
> 30 |   await page.click('img[src*="i.scdn.co"]', { position: { x: 5, y: 5 } }); // Try to click edge of art
     |              ^ Error: page.click: Test timeout of 30000ms exceeded.
  31 |   // Check if player expanded (it should not if stopPropagation works and we didn't click the container)
  32 | });
  33 |
```