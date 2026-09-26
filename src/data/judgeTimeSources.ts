export const judgeTimeSources: Record<
  string,
  {
    source: string;
    input: string;
    output: string;
    serialMs: number[];
    loadMs: number[];
  }
> = {
  'modulo-c99': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nlong long total=0; for(int i=0;i<n;i++) total+=i%97; x=total;\nprintf("%lld\\n", x); return 0; }\n',
    input: '100000000 123456789\n',
    output: '4799999352\n',
    serialMs: [166, 166, 166],
    loadMs: [218, 218, 232],
  },
  'modulo-cpp17': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nlong long total=0; for(int i=0;i<n;i++) total+=i%97; x=total;\nprintf("%lld\\n", x); return 0; }\n',
    input: '100000000 123456789\n',
    output: '4799999352\n',
    serialMs: [166, 165, 166],
    loadMs: [219, 319, 331],
  },
  'modulo-python313': {
    source:
      'n, x = map(int, input().split())\ntotal = 0\nfor i in range(n):\n    total += i % 97\nprint(total)\n',
    input: '100000000 123456789\n',
    output: '4799999352\n',
    serialMs: [16859, 14852, 15558],
    loadMs: [19371, 19934, 20178],
  },
  'modulo-java8': {
    source:
      'import java.util.Scanner;\npublic class Main { public static void main(String[] args) { Scanner in = new Scanner(System.in); int n=in.nextInt(); long x=in.nextLong();\nlong total=0; for(int i=0;i<n;i++) total+=i%97; x=total;\nSystem.out.println(x); }}\n',
    input: '100000000 123456789\n',
    output: '4799999352\n',
    serialMs: [216, 216, 217],
    loadMs: [322, 319, 317],
  },
  'dependent-c99': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nfor(int i=0;i<n;i++) x=(x*1664525+1013904223)%1000000007;\nprintf("%lld\\n", x); return 0; }\n',
    input: '100000000 123456789\n',
    output: '889003928\n',
    serialMs: [466, 467, 466],
    loadMs: [629, 621, 621],
  },
  'dependent-cpp17': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nfor(int i=0;i<n;i++) x=(x*1664525+1013904223)%1000000007;\nprintf("%lld\\n", x); return 0; }\n',
    input: '100000000 123456789\n',
    output: '889003928\n',
    serialMs: [466, 466, 466],
    loadMs: [620, 626, 630],
  },
  'dependent-python313': {
    source:
      'n, x = map(int, input().split())\nfor i in range(n):\n    x = (x * 1664525 + 1013904223) % 1000000007\nprint(x)\n',
    input: '100000000 123456789\n',
    output: '889003928\n',
    serialMs: [19312, 19410, 20627],
    loadMs: [24076, 24440, 24177],
  },
  'dependent-java8': {
    source:
      'import java.util.Scanner;\npublic class Main { public static void main(String[] args) { Scanner in = new Scanner(System.in); int n=in.nextInt(); long x=in.nextLong();\nfor(int i=0;i<n;i++) x=(x*1664525+1013904223)%1000000007;\nSystem.out.println(x); }}\n',
    input: '100000000 123456789\n',
    output: '889003928\n',
    serialMs: [618, 567, 617],
    loadMs: [777, 769, 776],
  },
  'memory-c99': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nint size=4194304; int *a=(int*)malloc(sizeof(int)*size); if(!a) return 2;\nfor(int i=0;i<size;i++) a[i]=(int)(((long long)i*1664525+1013904223)&(size-1)); x&=size-1; for(int i=0;i<n;i++) x=a[(int)x];\nprintf("%lld\\n", x); return 0; }\n',
    input: '100000000 123456789\n',
    output: '2385429\n',
    serialMs: [3073, 3426, 3426],
    loadMs: [10237, 10696, 13916],
  },
  'memory-cpp17': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nint size=4194304; int *a=(int*)malloc(sizeof(int)*size); if(!a) return 2;\nfor(int i=0;i<size;i++) a[i]=(int)(((long long)i*1664525+1013904223)&(size-1)); x&=size-1; for(int i=0;i<n;i++) x=a[(int)x];\nprintf("%lld\\n", x); return 0; }\n',
    input: '100000000 123456789\n',
    output: '2385429\n',
    serialMs: [3726, 3625, 3575],
    loadMs: [11057, 12611, 14512],
  },
  'memory-python313': {
    source:
      'n, x = map(int, input().split())\nsize = 4194304\na = [(1664525*i + 1013904223) & (size-1) for i in range(size)]\nx &= size-1\nfor i in range(n):\n    x = a[x]\nprint(x)\n',
    input: '100000000 123456789\n',
    output: '2385429\n',
    serialMs: [35106, 40966, 33350],
    loadMs: [45711, 48988, 51752],
  },
  'memory-java8': {
    source:
      'import java.util.Scanner;\npublic class Main { public static void main(String[] args) { Scanner in = new Scanner(System.in); int n=in.nextInt(); long x=in.nextLong();\nint size=4194304; int[] a=new int[size];\nfor(int i=0;i<size;i++) a[i]=(int)(((long)i*1664525+1013904223)&(size-1)); x&=size-1; for(int i=0;i<n;i++) x=a[(int)x];\nSystem.out.println(x); }}\n',
    input: '100000000 123456789\n',
    output: '2385429\n',
    serialMs: [3624, 3624, 3774],
    loadMs: [9593, 10998, 13146],
  },
  'search-c99': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nint size=1048576; int *a=(int*)malloc(sizeof(int)*size); if(!a) return 2;\nfor(int i=0;i<size;i++) a[i]=2*i; x&=size-1; for(int i=0;i<n;i++) { int target=(int)(2*x), lo=0,hi=size; while(lo<hi){int mid=(lo+hi)/2; if(a[mid]<target)lo=mid+1;else hi=mid;} x=(((long long)lo)*1664525+1013904223)&(size-1); }\nprintf("%lld\\n", x); return 0; }\n',
    input: '1000000 123456789\n',
    output: '626005\n',
    serialMs: [266, 265, 266],
    loadMs: [321, 371, 328],
  },
  'search-cpp17': {
    source:
      '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int n; long long x; if(scanf("%d %lld", &n, &x)!=2) return 1;\nint size=1048576; int *a=(int*)malloc(sizeof(int)*size); if(!a) return 2;\nfor(int i=0;i<size;i++) a[i]=2*i; x&=size-1; for(int i=0;i<n;i++) { int target=(int)(2*x), lo=0,hi=size; while(lo<hi){int mid=(lo+hi)/2; if(a[mid]<target)lo=mid+1;else hi=mid;} x=(((long long)lo)*1664525+1013904223)&(size-1); }\nprintf("%lld\\n", x); return 0; }\n',
    input: '1000000 123456789\n',
    output: '626005\n',
    serialMs: [266, 266, 266],
    loadMs: [334, 368, 369],
  },
  'search-python313': {
    source:
      'n, x = map(int, input().split())\nsize = 1048576\na = [2*i for i in range(size)]\nx &= size-1\nfor i in range(n):\n    target = 2*x\n    lo, hi = 0, size\n    while lo < hi:\n        mid = (lo+hi)//2\n        if a[mid] < target:\n            lo = mid+1\n        else:\n            hi = mid\n    x = (lo*1664525+1013904223) & (size-1)\nprint(x)\n',
    input: '1000000 123456789\n',
    output: '626005\n',
    serialMs: [7084, 6933, 6783],
    loadMs: [9044, 9858, 9393],
  },
  'search-java8': {
    source:
      'import java.util.Scanner;\npublic class Main { public static void main(String[] args) { Scanner in = new Scanner(System.in); int n=in.nextInt(); long x=in.nextLong();\nint size=1048576; int[] a=new int[size];\nfor(int i=0;i<size;i++) a[i]=2*i; x&=size-1; for(int i=0;i<n;i++) { int target=(int)(2*x), lo=0,hi=size; while(lo<hi){int mid=(lo+hi)/2; if(a[mid]<target)lo=mid+1;else hi=mid;} x=(((long)lo)*1664525+1013904223)&(size-1); }\nSystem.out.println(x); }}\n',
    input: '1000000 123456789\n',
    output: '626005\n',
    serialMs: [316, 316, 316],
    loadMs: [475, 432, 470],
  },
};
